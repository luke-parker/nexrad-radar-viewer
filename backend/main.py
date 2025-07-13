from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from reflectivity import get_reflectivity_data_for_station, get_reflectivity_timeline_for_station, RASTER_DIR
import numpy as np

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.mount("/rasters", StaticFiles(directory="rasters"), name="rasters")

IMAGE_CACHE = None

@app.get("/reflectivity")
def get_reflectivity(station: str = "KTLX", tilt: int = 0):
    bounds, raster_path, radar_lat, radar_lng = get_reflectivity_data_for_station(station, tilt)
    return {
        "bounds": bounds,
        "raster_path": raster_path,
        "station": station,
        "radar_coords": {
            "lat": radar_lat,
            "lng": radar_lng
        }
    }


@app.get("/reflectivity_timeline")
def get_reflectivity_timeline(station: str = "KTLX", tilt: int = 0):
    timeline = get_reflectivity_timeline_for_station(station, tilt)
    
    scans = []
    for bounds, raster_path, radar_lat, radar_lng in timeline:
        scans.append({
            "bounds": bounds,
            "raster_path": raster_path,
            "station": station,
            "radar_coords": {
                "lat": radar_lat,
                "lng": radar_lng
            }
        })
    
    return {
        "scans": scans
    }

