"use client";

import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

interface SnotelStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  swe: number;
  snowDepth: number;
}

const RadarMap = () => {
  const [mounted, setMounted] = useState(false);
  const [reflectivity, setReflectivity] = useState(0.6);

  useEffect(() => {
    setMounted(true);
  }, []);

//   const [radarUrl, setRadarUrl] = useState<string | null>(null);
//   const [snotel, setSnotel] = useState<SnotelStation[]>([]);

//   useEffect(() => {
//     // Fetch radar PNG
//     fetch("/api/radar?station=KTLX")
//       .then((res) => res.blob())
//       .then((blob) => setRadarUrl(URL.createObjectURL(blob)));

//     // Fetch SNOTEL data
//     fetch("/api/snotel")
//       .then((res) => res.json())
//       .then(setSnotel);
//   }, []);

//   const radarBounds: L.LatLngBoundsLiteral = [
//     [35.0, -98.0], // SW corner (approx)
//     [37.0, -96.0], // NE corner (approx)
//   ];

  if (!mounted) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[40.7608, -111.8910]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {/* {radarUrl && (
          <ImageOverlay url={radarUrl} bounds={radarBounds} opacity={0.6} />
        )} */}
        {/* {snotel.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lon]}>
            <Popup>
              <strong>{station.name}</strong>
              <br />
              SWE: {station.swe} in
              <br />
              Snow Depth: {station.snowDepth} in
            </Popup>
          </Marker>
        ))} */}
      </MapContainer>
      
      {/* Legend Panel */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-700 min-w-64 z-[1000]">
        <h3 className="text-white font-semibold mb-3 text-lg">Tools</h3>
        
        <div className="space-y-4">
          {/* Reflectivity Control */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Reflectivity</h4>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={reflectivity}
                onChange={(e) => setReflectivity(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-white text-sm min-w-[2rem]">{reflectivity}</span>
            </div>
          </div>

          {/* Layer Controls */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Layers</h4>
            <div className="space-y-2">
              <label className="flex items-center text-white text-sm">
                <input type="checkbox" className="mr-2 rounded" defaultChecked />
                Base Radar
              </label>
              <label className="flex items-center text-white text-sm">
                <input type="checkbox" className="mr-2 rounded" />
                Snow Depth
              </label>
              <label className="flex items-center text-white text-sm">
                <input type="checkbox" className="mr-2 rounded" />
                SWE Data
              </label>
            </div>
          </div>

          {/* Time Controls */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Time</h4>
            <div className="flex space-x-2">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                Previous
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                Play
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                Next
              </button>
            </div>
          </div>

          {/* Station Selection */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Radar Station</h4>
            <select className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm">
              <option>KTLX - Oklahoma City</option>
              <option>KFSD - Sioux Falls</option>
              <option>KMTX - Salt Lake City</option>
            </select>
          </div>

          {/* Legend */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Precip</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-3 bg-red-500 mr-2 rounded"></div>
                <span className="text-white">Heavy</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-3 bg-yellow-500 mr-2 rounded"></div>
                <span className="text-white">Moderate</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-3 bg-green-500 mr-2 rounded"></div>
                <span className="text-white">Light</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-3 bg-blue-500 mr-2 rounded"></div>
                <span className="text-white">Snow/Ice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMap;
