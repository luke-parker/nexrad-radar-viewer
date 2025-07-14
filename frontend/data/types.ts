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
