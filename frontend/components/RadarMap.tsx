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

// Station codes for validation
const RADAR_STATION_CODES = [
  "KABR", "KENX", "KABX", "KAMA", "PAHG", "PGUA", "KFFC", "KBBX", "PABC", "KBLX",
  "KBGM", "PACG", "KBMX", "KBIS", "KFCX", "KCBX", "KBOX", "KBRO", "KBUF", "KCXX",
  "RKSG", "KFDX", "KCBW", "KICX", "KGRK", "KCLX", "KRLX", "KCYS", "KLOT", "KILN",
  "KCLE", "KCAE", "KGWX", "KCRP", "KFTG", "KDMX", "KDTX", "KDDC", "KDOX", "KDLH",
  "KDYX", "KEYX", "KEPZ", "KLRX", "KBHX", "KVWX", "PAPD", "KFSX", "KSRX", "KFDR",
  "KHPX", "KPOE", "KEOX", "KFWS", "KAPX", "KGGW", "KGLD", "KMVX", "KGJX", "KGRR",
  "KTFX", "KGRB", "KGSP", "KUEX", "KHDX", "KHGX", "KHTX", "KIND", "KJKL", "KDGX",
  "KJAX", "RODN", "PHKM", "KEAX", "KBYX", "PAKC", "KMRX", "RKJK", "KARX", "KLCH",
  "KLGX", "KESX", "KDFX", "KILX", "KLZK", "KVTX", "KLVX", "KLBB", "KMQT", "KMXX",
  "KMAX", "KMLB", "KNQA", "KAMX", "PAIH", "KMAF", "KMKX", "KMPX", "KMBX", "KMSX",
  "KMOB", "PHMO", "KTYX", "KVAX", "KMHX", "KOHX", "KLIX", "KOKX", "PAEC", "KLNX",
  "KIWX", "KEVX", "KTLX", "KOAX", "KPAH", "KPDT", "KDIX", "KIWA", "KPBZ", "KSFX",
  "KGYX", "KRTX", "KPUX", "KDVN", "KRAX", "KUDX", "KRGX", "KRIW", "KJGX", "KDAX",
  "KMTX", "KSJT", "KEWX", "KNKX", "KMUX", "KHNX", "TJUA", "KSOX", "KATX", "KSHV",
  "KFSD", "PHKI", "PHWA", "KOTX", "KSGF", "KLSX", "KCCX", "KLWX", "KTLH", "KTBW",
  "KTWX", "KEMX", "KINX", "KVNX", "KVBX", "KAKQ", "KICT", "KLTX", "KYUX"
];

const RadarMap = () => {
  const [mounted, setMounted] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [selectedScan, setSelectedScan] = useState(9);
  const [selectedStation, setSelectedStation] = useState("KTLX");
  const [stationInput, setStationInput] = useState("KTLX");
  const [currentReflectivityFrame, setCurrentReflectivityFrame] =
    useState<ReflectivityFrame | null>(null);
  const [reflectivityFrames, setReflectivityFrames] = useState<
    ReflectivityFrame[]
  >([]);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.597, -97.17]);
  const prevStationRef = useRef<string>("KTLX");

  const getStationCenter = (): [number, number] => {
    return mapCenter;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScan = parseInt(e.target.value);
    setSelectedScan(newScan);
    setCurrentReflectivityFrame(reflectivityFrames[newScan]);
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
        
        // Only update map center if station has changed
        if (selectedStation !== prevStationRef.current) {
          const newFrame = timeline?.scans?.findLast(() => true);
          if (newFrame?.radar_coords) {
            setMapCenter([newFrame.radar_coords.lat, newFrame.radar_coords.lng]);
          }
          prevStationRef.current = selectedStation;
        }
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
        dragging={true}
        zoomControl={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
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
            <div className="relative">
              <input
                list="radar-stations"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm pr-8"
                value={stationInput}
                onChange={(e) => setStationInput(e.target.value.toUpperCase())}
                onInput={(e) => {
                  const value = (e.target as HTMLInputElement).value.toUpperCase();
                  if (RADAR_STATION_CODES.includes(value)) {
                    setSelectedStation(value);
                  }
                }}
                onBlur={() => {
                  if (stationInput.length === 4) {
                    setSelectedStation(stationInput);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && stationInput.length === 4) {
                    setSelectedStation(stationInput);
                  }
                }}
                placeholder="Enter station code (e.g., KTLX)"
                maxLength={4}
              />
              <datalist id="radar-stations">
                <option value="KABR">KABR - Aberdeen, SD</option>
                <option value="KENX">KENX - Albany, NY</option>
                <option value="KABX">KABX - Albuquerque, NM</option>
                <option value="KAMA">KAMA - Amarillo, TX</option>
                <option value="PAHG">PAHG - Anchorage/Kenai, AK</option>
                <option value="PGUA">PGUA - Andersen AFB, Guam</option>
                <option value="KFFC">KFFC - Atlanta, GA</option>
                <option value="KBBX">KBBX - Beale AFB, CA</option>
                <option value="PABC">PABC - Bethel, AK</option>
                <option value="KBLX">KBLX - Billings, MT</option>
                <option value="KBGM">KBGM - Binghamton, NY</option>
                <option value="PACG">PACG - Biorka Island/Sitka, AK</option>
                <option value="KBMX">KBMX - Birmingham, AL</option>
                <option value="KBIS">KBIS - Bismarck, ND</option>
                <option value="KFCX">KFCX - Blacksburg, VA</option>
                <option value="KCBX">KCBX - Boise, ID</option>
                <option value="KBOX">KBOX - Boston, MA</option>
                <option value="KBRO">KBRO - Brownsville, TX</option>
                <option value="KBUF">KBUF - Buffalo, NY</option>
                <option value="KCXX">KCXX - Burlington, VT</option>
                <option value="RKSG">RKSG - Camp Humphreys, KO</option>
                <option value="KFDX">KFDX - Cannon AFB, NM</option>
                <option value="KCBW">KCBW - Caribou, ME</option>
                <option value="KICX">KICX - Cedar City, UT</option>
                <option value="KGRK">KGRK - Central Texas/Ft Hood, TX</option>
                <option value="KCLX">KCLX - Charleston, SC</option>
                <option value="KRLX">KRLX - Charleston, WV</option>
                <option value="KCYS">KCYS - Cheyenne, WY</option>
                <option value="KLOT">KLOT - Chicago, IL</option>
                <option value="KILN">KILN - Cincinnati/Wilmington, OH</option>
                <option value="KCLE">KCLE - Cleveland, OH</option>
                <option value="KCAE">KCAE - Columbia, SC</option>
                <option value="KGWX">KGWX - Columbus AFB, MS</option>
                <option value="KCRP">KCRP - Corpus Christi, TX</option>
                <option value="KFTG">KFTG - Denver, CO</option>
                <option value="KDMX">KDMX - Des Moines, IA</option>
                <option value="KDTX">KDTX - Detroit, MI</option>
                <option value="KDDC">KDDC - Dodge City, KS</option>
                <option value="KDOX">KDOX - Dover AFB, DE</option>
                <option value="KDLH">KDLH - Duluth, MN</option>
                <option value="KDYX">KDYX - Dyess AFB, TX</option>
                <option value="KEYX">KEYX - Edwards AFB, CA</option>
                <option value="KEPZ">KEPZ - El Paso, TX</option>
                <option value="KLRX">KLRX - Elko, NV</option>
                <option value="KBHX">KBHX - Eureka, CA</option>
                <option value="KVWX">KVWX - Evansville, IN</option>
                <option value="PAPD">PAPD - Fairbanks/Pedro Dome, AK</option>
                <option value="KFSX">KFSX - Flagstaff, AZ</option>
                <option value="KSRX">KSRX - Fort Smith, AR</option>
                <option value="KFDR">KFDR - Frederick/Altus AFB, OK</option>
                <option value="KHPX">KHPX - Ft Campbell, KY</option>
                <option value="KPOE">KPOE - Ft Polk, LA</option>
                <option value="KEOX">KEOX - Ft Rucker, AL</option>
                <option value="KFWS">KFWS - Ft Worth, TX</option>
                <option value="KAPX">KAPX - Gaylord, MI</option>
                <option value="KGGW">KGGW - Glasgow, MT</option>
                <option value="KGLD">KGLD - Goodland, KS</option>
                <option value="KMVX">KMVX - Grand Forks, ND</option>
                <option value="KGJX">KGJX - Grand Junction, CO</option>
                <option value="KGRR">KGRR - Grand Rapids, MI</option>
                <option value="KTFX">KTFX - Great Falls, MT</option>
                <option value="KGRB">KGRB - Green Bay, WI</option>
                <option value="KGSP">KGSP - Greer, SC</option>
                <option value="KUEX">KUEX - Hastings, NE</option>
                <option value="KHDX">KHDX - Holloman AFB, NM</option>
                <option value="KHGX">KHGX - Houston, TX</option>
                <option value="KHTX">KHTX - Huntsville/Hytop, AL</option>
                <option value="KIND">KIND - Indianapolis, IN</option>
                <option value="KJKL">KJKL - Jackson, KY</option>
                <option value="KDGX">KDGX - Jackson, MS</option>
                <option value="KJAX">KJAX - Jacksonville, FL</option>
                <option value="RODN">RODN - Kadena, JP</option>
                <option value="PHKM">PHKM - Kamuela/Kohala, HI</option>
                <option value="KEAX">KEAX - Kansas City, MO</option>
                <option value="KBYX">KBYX - Key West, FL</option>
                <option value="PAKC">PAKC - King Salmon, AK</option>
                <option value="KMRX">KMRX - Knoxville/Morristown, TN</option>
                <option value="RKJK">RKJK - Kunsan, KO</option>
                <option value="KARX">KARX - La Crosse, WI</option>
                <option value="KLCH">KLCH - Lake Charles, LA</option>
                <option value="KLGX">KLGX - Langley Hill, WA</option>
                <option value="KESX">KESX - Las Vegas, NV</option>
                <option value="KDFX">KDFX - Laughlin AFB, TX</option>
                <option value="KILX">KILX - Lincoln, IL</option>
                <option value="KLZK">KLZK - Little Rock, AR</option>
                <option value="KVTX">KVTX - Los Angeles, CA</option>
                <option value="KLVX">KLVX - Louisville, KY</option>
                <option value="KLBB">KLBB - Lubbock, TX</option>
                <option value="KMQT">KMQT - Marquette, MI</option>
                <option value="KMXX">KMXX - Maxwell AFB, AL</option>
                <option value="KMAX">KMAX - Medford, OR</option>
                <option value="KMLB">KMLB - Melbourne, FL</option>
                <option value="KNQA">KNQA - Memphis, TN</option>
                <option value="KAMX">KAMX - Miami, FL</option>
                <option value="PAIH">PAIH - Middleton Island, AK</option>
                <option value="KMAF">KMAF - Midland/Odessa, TX</option>
                <option value="KMKX">KMKX - Milwaukee, WI</option>
                <option value="KMPX">KMPX - Minneapolis, MN</option>
                <option value="KMBX">KMBX - Minot AFB, ND</option>
                <option value="KMSX">KMSX - Missoula, MT</option>
                <option value="KMOB">KMOB - Mobile, AL</option>
                <option value="PHMO">PHMO - Molokai, HI</option>
                <option value="KTYX">KTYX - Montague/Ft Drum, NY</option>
                <option value="KVAX">KVAX - Moody AFB, GA</option>
                <option value="KMHX">KMHX - Morehead City, NC</option>
                <option value="KOHX">KOHX - Nashville, TN</option>
                <option value="KLIX">KLIX - New Orleans, LA</option>
                <option value="KOKX">KOKX - New York City/Upton, NY</option>
                <option value="PAEC">PAEC - Nome, AK</option>
                <option value="KLNX">KLNX - North Platte, NE</option>
                <option value="KIWX">KIWX - Northern Indiana/North Webster, IN</option>
                <option value="KEVX">KEVX - Northwest Florida/Eglin AFB, FL</option>
                <option value="KTLX">KTLX - Oklahoma City, OK</option>
                <option value="KOAX">KOAX - Omaha, NE</option>
                <option value="KPAH">KPAH - Paducah, KY</option>
                <option value="KPDT">KPDT - Pendleton, OR</option>
                <option value="KDIX">KDIX - Philadelphia, PA</option>
                <option value="KIWA">KIWA - Phoenix, AZ</option>
                <option value="KPBZ">KPBZ - Pittsburgh, PA</option>
                <option value="KSFX">KSFX - Pocatello, ID</option>
                <option value="KGYX">KGYX - Portland, ME</option>
                <option value="KRTX">KRTX - Portland, OR</option>
                <option value="KPUX">KPUX - Pueblo, CO</option>
                <option value="KDVN">KDVN - Quad Cities/Davenport, IA</option>
                <option value="KRAX">KRAX - Raleigh/Durham, NC</option>
                <option value="KUDX">KUDX - Rapid City, SD</option>
                <option value="KRGX">KRGX - Reno, NV</option>
                <option value="KRIW">KRIW - Riverton, WY</option>
                <option value="KJGX">KJGX - Robins AFB, GA</option>
                <option value="KDAX">KDAX - Sacramento, CA</option>
                <option value="KMTX">KMTX - Salt Lake City, UT</option>
                <option value="KSJT">KSJT - San Angelo, TX</option>
                <option value="KEWX">KEWX - San Antonio, TX</option>
                <option value="KNKX">KNKX - San Diego, CA</option>
                <option value="KMUX">KMUX - San Francisco, CA</option>
                <option value="KHNX">KHNX - San Joaquin Valley, CA</option>
                <option value="TJUA">TJUA - San Juan, PR</option>
                <option value="KSOX">KSOX - Santa Ana Mountains, CA</option>
                <option value="KATX">KATX - Seattle, WA</option>
                <option value="KSHV">KSHV - Shreveport, LA</option>
                <option value="KFSD">KFSD - Sioux Falls, SD</option>
                <option value="PHKI">PHKI - South Kauai, HI</option>
                <option value="PHWA">PHWA - South Shore, HI</option>
                <option value="KOTX">KOTX - Spokane, WA</option>
                <option value="KSGF">KSGF - Springfield, MO</option>
                <option value="KLSX">KLSX - St Louis, MO</option>
                <option value="KCCX">KCCX - State College, PA</option>
                <option value="KLWX">KLWX - Sterling, VA</option>
                <option value="KTLH">KTLH - Tallahassee, FL</option>
                <option value="KTBW">KTBW - Tampa Bay, FL</option>
                <option value="KTWX">KTWX - Topeka, KS</option>
                <option value="KEMX">KEMX - Tucson, AZ</option>
                <option value="KINX">KINX - Tulsa, OK</option>
                <option value="KVNX">KVNX - Vance AFB, OK</option>
                <option value="KVBX">KVBX - Vandenberg AFB, CA</option>
                <option value="KAKQ">KAKQ - Wakefield, VA</option>
                <option value="KICT">KICT - Wichita, KS</option>
                <option value="KLTX">KLTX - Wilmington, NC</option>
                <option value="KYUX">KYUX - Yuma, AZ</option>
              </datalist>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
              <span className="text-white text-sm min-w-[2rem]">-1hr</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMap;
