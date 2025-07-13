"use client";

import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import { getReflectivityData, getReflectivityTimeline } from "@/data/actions";
import { BASE_URL } from "@/data/api";

function UpdateMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

const RadarMap = () => {
  const [mounted, setMounted] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [selectedScan, setSelectedScan] = useState(9);
  const [selectedStation, setSelectedStation] = useState("KTLX");
  const [currentReflectivityFrame, setCurrentReflectivityFrame] =
    useState<ReflectivityFrame | null>(null);
  const [reflectivityFrames, setReflectivityFrames] = useState<
    ReflectivityFrame[]
  >([]);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getStationCenter = (): [number, number] => {
    if (currentReflectivityFrame?.radar_coords) {
      return [
        currentReflectivityFrame.radar_coords.lat,
        currentReflectivityFrame.radar_coords.lng,
      ];
    }

    return [35.597, -97.17];
  };

  // Custom handler for time slider
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScan = parseInt(e.target.value);
    setSelectedScan(newScan);
    setCurrentReflectivityFrame(reflectivityFrames[newScan]);

    console.log(`Time changed to scan ${newScan}`);
  };

  const handlePrevious = () => {
    if (selectedScan > 0) {
      const newScan = selectedScan - 1;
      setSelectedScan(newScan);
      setCurrentReflectivityFrame(reflectivityFrames[newScan]);
    }
  };

  const handleNext = () => {
    if (selectedScan < reflectivityFrames.length - 1) {
      const newScan = selectedScan + 1;
      setSelectedScan(newScan);
      setCurrentReflectivityFrame(reflectivityFrames[newScan]);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    } else {
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setSelectedScan((prevScan) => {
          if (prevScan >= reflectivityFrames.length - 1) {
            setIsPlaying(false);
            if (playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            return prevScan;
          }
          const newScan = prevScan + 1;
          setCurrentReflectivityFrame(reflectivityFrames[newScan]);
          return newScan;
        });
      }, 500);
    }
  };

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoadingFrame(true);
      try {
        const timeline = await getReflectivityTimeline(selectedStation, tilt);
        setReflectivityFrames(timeline?.scans || []);
        setCurrentReflectivityFrame(
          timeline?.scans?.findLast(() => true) || null
        );
      } catch (error) {
        console.error("Failed to fetch reflectivity metadata:", error);
      } finally {
        setIsLoadingFrame(false);
      }
    };

    if (mounted) {
      fetchMetadata();
    }
  }, [selectedStation, tilt, mounted]);

  if (!mounted) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      {isLoadingFrame && (
        <div className="absolute inset-0 z-[1000] pointer-events-none">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
      )}
      <MapContainer
        center={getStationCenter()}
        zoom={9}
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <UpdateMapCenter center={getStationCenter()} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {mounted && (
          <>
            <Marker
              position={getStationCenter()}
              icon={
                new L.Icon({
                  iconUrl: "/marker.svg",
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                })
              }
            >
              {/* Dynamic location of the selected NEXRAD station */}
              <Popup>{selectedStation} NEXRAD Station</Popup>
            </Marker>
            {currentReflectivityFrame && (
              <ImageOverlay
                url={`${BASE_URL}/${currentReflectivityFrame.raster_path}`}
                bounds={[
                  currentReflectivityFrame.bounds.sw,
                  currentReflectivityFrame.bounds.ne,
                ]}
                opacity={0.6}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Tools Panel */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-700 min-w-64 z-[1000]">
        <div className="flex items-center justify-start mb-4">
          <h3 className="text-white font-semibold text-lg">
            {selectedStation} Radar Data
          </h3>
          <div className="relative flex items-center space-x-2 ml-4">
            <span className="text-white text-sm font-medium">Live</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Station Selection */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">
              Radar Station
            </h4>
            <select
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
            >
              <option value="KTLX">KTLX - Oklahoma City</option>
              <option value="KMTX">KMTX - Salt Lake City</option>
              <option value="KABR">KABR - Aberdeen</option>
              <option value="KABX">KABX - Albuquerque</option>
              <option value="KAKQ">KAKQ - Wakefield</option>
              <option value="KAMA">KAMA - Amarillo</option>
              <option value="KAMX">KAMX - Miami</option>
              <option value="KAPX">KAPX - Gaylord</option>
              <option value="KARX">KARX - La Crosse</option>
              <option value="KATX">KATX - Topeka</option>
              <option value="KBBX">KBBX - Beale AFB</option>
              <option value="KBGM">KBGM - Binghamton</option>
              <option value="KBHX">KBHX - Eureka</option>
              <option value="KBIS">KBIS - Bismarck</option>
              <option value="KBLX">KBLX - Billings</option>
              <option value="KBMX">KBMX - Birmingham</option>
              <option value="KBOX">KBOX - Boston</option>
              <option value="KBRO">KBRO - Brownsville</option>
              <option value="KBUF">KBUF - Buffalo</option>
              <option value="KBYX">KBYX - Key West</option>
              <option value="KCAE">KCAE - Columbia</option>
              <option value="KCBW">KCBW - Cannon AFB</option>
              <option value="KCBX">KCBX - Chicago</option>
              <option value="KCCX">KCCX - Cleveland</option>
              <option value="KCXX">KCXX - Charleston</option>
              <option value="KCYS">KCYS - Cheyenne</option>
              <option value="KDAX">KDAX - Sacramento</option>
              <option value="KDDC">KDDC - Dodge City</option>
              <option value="KDFX">KDFX - Laughlin AFB</option>
              <option value="KDGX">KDGX - Dugway Proving Ground</option>
              <option value="KDIX">KDIX - Philadelphia</option>
              <option value="KDLH">KDLH - Duluth</option>
              <option value="KDMX">KDMX - Des Moines</option>
              <option value="KDOX">KDOX - Dover AFB</option>
              <option value="KDTX">KDTX - Detroit</option>
              <option value="KDVN">KDVN - Davenport</option>
              <option value="KDYX">KDYX - Dyess AFB</option>
              <option value="KEAX">KEAX - Kansas City</option>
              <option value="KEMX">KEMX - Edwards AFB</option>
              <option value="KENX">KENX - Albany</option>
              <option value="KEOX">KEOX - Fort Rucker</option>
              <option value="KEPZ">KEPZ - El Paso</option>
              <option value="KESX">KESX - Las Vegas</option>
              <option value="KEVX">KEVX - Eglin AFB</option>
              <option value="KEWX">KEWX - Austin/San Antonio</option>
              <option value="KEYX">KEYX - Edwards AFB</option>
              <option value="KEZF">KEZF - Washington DC</option>
              <option value="KFCX">KFCX - Roanoke</option>
              <option value="KFDR">KFDR - Frederick</option>
              <option value="KFDX">KFDX - Laughlin AFB</option>
              <option value="KFFC">KFFC - Atlanta</option>
              <option value="KFSD">KFSD - Sioux Falls</option>
              <option value="KFSX">KFSX - Flagstaff</option>
              <option value="KFTG">KFTG - Denver</option>
              <option value="KGGW">KGGW - Glasgow</option>
              <option value="KGJX">KGJX - Grand Junction</option>
              <option value="KGLD">KGLD - Goodland</option>
              <option value="KGRB">KGRB - Green Bay</option>
              <option value="KGRR">KGRR - Grand Rapids</option>
              <option value="KGSP">KGSP - Greenville-Spartanburg</option>
              <option value="KGWX">KGWX - Columbus AFB</option>
              <option value="KGYX">KGYX - Portland</option>
              <option value="KHDX">KHDX - Honolulu</option>
              <option value="KHGX">KHGX - Houston</option>
              <option value="KHNX">KHNX - San Joaquin Valley</option>
              <option value="KHPX">KHPX - Honolulu</option>
              <option value="KHTX">KHTX - Houston</option>
              <option value="KICT">KICT - Wichita</option>
              <option value="KICX">KICX - Wilmington</option>
              <option value="KILN">KILN - Wilmington</option>
              <option value="KILX">KILX - Lincoln</option>
              <option value="KIND">KIND - Indianapolis</option>
              <option value="KINX">KINX - Wilmington</option>
              <option value="KIWA">KIWA - Phoenix</option>
            </select>
          </div>

          {/* Tilt Control */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Tilt</h4>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="13"
                step="1"
                value={tilt}
                onChange={(e) => setTilt(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-white text-sm min-w-[2rem]">{tilt}</span>
            </div>
          </div>

          {/* Time Controls */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Time</h4>
            <div className="flex items-center space-x-2 pb-4">
              <span className="text-white text-sm min-w-[2rem]">-5hr</span>
              <input
                type="range"
                min="0"
                max={reflectivityFrames.length - 1}
                step="1"
                value={selectedScan}
                onChange={handleTimeChange}
                className="flex-1"
              />
              <span className="text-white text-sm min-w-[2rem]">Now</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrevious}
                disabled={selectedScan <= 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Previous
              </button>
              <button
                onClick={handlePlayPause}
                className={`${
                  isPlaying
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                } text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1`}
              >
                <span>{isPlaying ? "Pause" : "Play"}</span>
                {isPlaying && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-3 bg-white animate-pulse"></div>
                    <div
                      className="w-1 h-3 bg-white animate-pulse"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1 h-3 bg-white animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                )}
              </button>
              <button
                onClick={handleNext}
                disabled={selectedScan >= reflectivityFrames.length - 1}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>
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
              {/* <div className="flex items-center">
                <div className="w-4 h-3 bg-blue-500 mr-2 rounded"></div>
                <span className="text-white">Snow/Ice</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMap;
