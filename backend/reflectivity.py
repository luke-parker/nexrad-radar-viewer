import nexradaws
import datetime
import pyart
import tempfile
import os
import numpy
from pyart.core.transforms import antenna_to_cartesian, cartesian_to_geographic
from pyart.map import grid_from_radars
from matplotlib import pyplot as plt
from matplotlib import cm
from matplotlib.colors import Normalize
from PIL import Image
import io
import shutil
import json


RASTER_DIR = "rasters"
os.makedirs(RASTER_DIR, exist_ok=True)
RADAR_CACHE_DIR = "nexrad_cache"
os.makedirs(RADAR_CACHE_DIR, exist_ok=True)


# Returns most recent scan
def get_reflectivity_data_for_station(station='KTLX', tilt=0):
    conn = nexradaws.NexradAwsInterface()

    dt = datetime.datetime.utcnow()
    results = conn.get_avail_scans(dt.year, dt.month, dt.day, station)
    results = [r for r in results if r.key.endswith("V06")]

    if not results:
        raise Exception(f"No scans available for station {station} on {dt.date()}")

    latest_scan = results[-1]
    return process_scan(conn, latest_scan, tilt, station)


# Returns 10 most recent scans
def get_reflectivity_timeline_for_station(station='KTLX', tilt=0):
    conn = nexradaws.NexradAwsInterface()
    dt = datetime.datetime.utcnow()

    results = conn.get_avail_scans(dt.year, dt.month, dt.day, station)
    results = [r for r in results if r.key.endswith("V06")]
    recent_scans = results[-10:]
    # recent_scans = results[-50::5][-10:]

    timeline = []
    for scan in recent_scans:
        try:
            result = process_scan(conn, scan, tilt, station)
            timeline.append(result)
        except Exception as e:
            print(f"Skipping scan at {scan.scan_time}: {e}")

    return timeline


def process_scan(conn, scan, tilt, station):
    path_to_scan = get_or_download_scan(conn, scan, station)
    radar_meta_path = path_to_scan + f"_tilt{tilt}.meta.json"

    print("Looking for: " + radar_meta_path)
    # If cache path exists, return all cached data
    if os.path.exists(radar_meta_path):
        print("Cache exists, loading from cache")
        with open(radar_meta_path, "rb") as f:
            radar_metadata = json.load(f)
        cache_key = get_radar_cache_key(
            radar_metadata["station"],
            radar_metadata["time_origin"],
            radar_metadata["offset_sec"],
            radar_metadata["tilt"]
        )

        raster_path = os.path.join(RASTER_DIR, f"{cache_key}.png")
        raster_meta_path = os.path.join(RASTER_DIR, f"{cache_key}.json")
        radar_lat = radar_metadata["lat"]
        radar_lon = radar_metadata["lon"]

        with open(raster_path, "rb") as f:
            image_bytes = f.read()
        print(f"Loaded cached raster: {raster_path}")
        with open(raster_meta_path) as f:
            bounds = json.load(f)
        return bounds, raster_path, radar_lat, radar_lon

    radar = pyart.io.read_nexrad_archive(path_to_scan)
    radar_lat = radar.latitude['data'][0]
    radar_lon = radar.longitude['data'][0]

    cache_key = get_radar_cache_key_for_radar(radar, tilt)
    radar_meta_path = os.path.join(RADAR_CACHE_DIR, f"{cache_key}.meta.json")
    raster_path = os.path.join(RASTER_DIR, f"{cache_key}.png")
    raster_meta_path = os.path.join(RASTER_DIR, f"{cache_key}.json")
    tilt0 = radar.extract_sweeps([tilt])
    grid = grid_from_radars(
        tilt0,
        grid_shape=(1, 500, 500), # resolution for raster
        grid_limits=((0, 1000),    # height
                        (-150000, 150000),  # north-south
                        (-150000, 150000)), # east-west
        fields=["reflectivity"]
    )
    bounds_lat = grid.point_latitude['data'][0]
    bounds_lon = grid.point_longitude['data'][0]

    refl = grid.fields['reflectivity']['data'][0]
    image_bytes = generate_reflectivity_raster(refl)
    with open(raster_path, "wb") as f:
        f.write(image_bytes)
    print(f"Saved raster to cache: {raster_path}")
    bounds = {
        "sw": [float(bounds_lat.min()), float(bounds_lon.min())],
        "ne": [float(bounds_lat.max()), float(bounds_lon.max())]
    }
    metadata = {
        "station": radar.metadata["instrument_name"],
        "lat": float(radar_lat),
        "lon": float(radar_lon),
        "time_origin": radar.time["units"],
        "offset_sec": radar.time["data"][0],
        "tilt": tilt
    }
    with open(raster_meta_path, "w") as f:
        json.dump(bounds, f)
    with open(path_to_scan + f"_tilt{tilt}.meta.json", "w") as f:
        json.dump(metadata, f)

    return bounds, raster_path, radar_lat, radar_lon



# Downalods if necessary and returns the file path for the designated scan
def get_or_download_scan(conn, scan, station):
    key = scan.key.split("/")[-1]
    cached_path = os.path.join(RADAR_CACHE_DIR, station, key)
    os.makedirs(os.path.dirname(cached_path), exist_ok=True)

    if os.path.exists(cached_path):
        print(f"Loaded cached radar file: {cached_path}")
        return cached_path

    with tempfile.TemporaryDirectory() as tmpdir:
        downloaded = conn.download([scan], tmpdir)
        
        file_obj = downloaded.success[0]
        filepath = getattr(file_obj, 'decompressed', file_obj.filepath)

        # Copy to cache
        shutil.copy(filepath, cached_path)
        print(f"Saved radar file to cache: {cached_path}")
        return cached_path



# Converts 2d reflectivity array into rasterized image for visualization
def generate_reflectivity_raster(refl_grid: numpy.ndarray, cmap_name='nipy_spectral') -> bytes:
    dbz_min = 10 
    masked = numpy.ma.masked_less(refl_grid, dbz_min)

    norm = Normalize(vmin=-20, vmax=75)
    cmap = cm.get_cmap(cmap_name)

    rgba_img = cmap(norm(masked.filled(numpy.nan)))

    img_data = (rgba_img * 255).astype(numpy.uint8)
    img = Image.fromarray(img_data, mode='RGBA')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')

    return buffer.getvalue()


def get_radar_cache_key_for_radar(radar, tilt=0):
    station = radar.metadata["instrument_name"]
    time_origin = radar.time["units"]
    offset_sec = radar.time["data"][0]

    return get_radar_cache_key(station, time_origin, offset_sec, tilt)


def get_radar_cache_key(station, time_origin, offset_sec, tilt):
    dt_str = time_origin.replace("seconds since ", "")
    dt = datetime.datetime.fromisoformat(dt_str.replace("Z", ""))
    timestamp = (dt + datetime.timedelta(seconds=float(offset_sec))).strftime("%Y%m%dT%H%M%S")

    return f"{station}_tilt{tilt}_{timestamp}"


if __name__ == "__main__":
    image, grid = get_reflectivity_map()

    with open("test_reflectivity.png", "wb") as f:
        f.write(image)
    
    print("Saved reflectivity image to test_reflectivity.png")
