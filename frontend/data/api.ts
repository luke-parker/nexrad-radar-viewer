import axios from "axios";

export const BASE_URL = "http://localhost:8000";

export async function api_getReflectivityMetadata(station: string = "KTLX", tilt: number = 0): Promise<ReflectivityFrame | null> {
  try {
    const response = await axios.get(`${BASE_URL}/reflectivity?station=${station}&tilt=${tilt}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("error:", error);
    throw new Error("Failed to fetch reflectivity metadata");
  }
}

export async function api_getReflectivityTimeline(station: string = "KTLX", tilt: number = 0): Promise<ReflectivityTimeline | null> {
  try {
    const response = await axios.get(`${BASE_URL}/reflectivity_timeline?station=${station}&tilt=${tilt}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("error:", error);
    throw new Error("Failed to fetch reflectivity timeline");
  }
}


