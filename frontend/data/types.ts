type ReflectivityPoint = {
  lat: number;
  lng: number;
  value: number; // reflectivity in dBZ
};

type SnotelStation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  swe: number;
  snowDepth: number;
};

type ReflectivityFrame = {
  bounds: {
    sw: [number, number];
    ne: [number, number];
  };
  raster_path: string;
  station: string;
  radar_coords: {
    lat: number;
    lng: number;
  };
};

type ReflectivityTimeline = {
    scans: ReflectivityFrame[];
}
