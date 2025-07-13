"use server";

import { api_getReflectivityMetadata, api_getReflectivityTimeline } from "./api";

export async function getReflectivityData(station: string, tilt: number = 0) {
  return await api_getReflectivityMetadata(station, tilt);
}

export async function getReflectivityTimeline(station: string, tilt: number = 0) {
  return await api_getReflectivityTimeline(station, tilt);
}