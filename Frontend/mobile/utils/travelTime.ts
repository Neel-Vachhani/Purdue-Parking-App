// utils/travelTime.ts
import { Platform } from "react-native";
import * as Location from "expo-location";
import { getApiBaseUrl } from "../config/env";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface TravelTimeResult {
  distance: number; // in miles
  duration: number; // in minutes
  formattedDistance: string;
  formattedDuration: string;
  originType?: "saved" | "current"; // Track which origin was used
}

/**
 * Calculate straight-line distance between two coordinates using the Haversine formula
 * Returns distance in miles
 */
function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Estimate driving time based on distance
 * Uses an average speed estimate adjusted for campus/city driving
 */
function estimateTravelTime(distanceInMiles: number): number {
  // Average speed: 20 mph for campus/city driving
  const avgSpeed = 20;
  return (distanceInMiles / avgSpeed) * 60; // convert to minutes
}

/**
 * Format distance for display
 */
function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min";
  } else if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Geocode an address to coordinates using backend API proxy
 * The backend securely handles the Google Maps API key
 * Returns null if geocoding fails
 * Prioritizes results near West Lafayette, Indiana for better accuracy
 */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  if (!address || address.trim() === "") {
    console.log("Geocode: Empty address");
    return null;
  }
  
  try {
    const API_BASE = getApiBaseUrl();
    const encodedAddress = encodeURIComponent(address.trim());
    
    console.log(`Geocoding via backend: "${address}"`);
    const response = await fetch(`${API_BASE}/api/geocode/?address=${encodedAddress}`);
    
    if (!response.ok) {
      console.error(`Backend geocoding failed: ${response.status}`);
      if (response.status === 503) {
        console.error("⚠️  Geocoding service not configured on backend. Check GOOGLE_MAPS_API_KEY in backend .env");
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      console.log(`✅ Geocoded: ${data.formatted_address || address}`);
      console.log(`   Coords: ${data.latitude}, ${data.longitude}`);
      
      return {
        latitude: data.latitude,
        longitude: data.longitude
      };
    } else if (data.error) {
      console.error(`❌ Geocoding error: ${data.error}`);
      return null;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Geocoding network error:", error);
    return null;
  }
}

/**
 * Calculate travel time from origin to destination
 */
export async function calculateTravelTime(
  origin: string | Coordinate,
  destination: Coordinate
): Promise<TravelTimeResult | null> {
  try {
    let originCoord: Coordinate | null;
    
    // If origin is a string (address), geocode it first
    if (typeof origin === "string") {
      originCoord = await geocodeAddress(origin);
      if (!originCoord) {
        console.error("Failed to geocode origin address:", origin);
        return null;
      }
    } else {
      originCoord = origin;
    }
    
    // Calculate distance
    const distance = calculateDistance(originCoord, destination);
    
    // Estimate travel time
    const duration = estimateTravelTime(distance);
    
    return {
      distance,
      duration,
      formattedDistance: formatDistance(distance),
      formattedDuration: formatDuration(duration),
    };
  } catch (error) {
    console.error("Error calculating travel time:", error);
    return null;
  }
}

/**
 * Get device's current location
 * Requests permissions if needed
 * Returns null if permission denied or location unavailable
 */
export async function getCurrentLocation(): Promise<Coordinate | null> {
  try {
    console.log("Requesting location permissions...");
    
    // Request foreground permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log("Location permission denied");
      return null;
    }
    
    console.log("Location permission granted, getting current position...");
    
    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    console.log(`Current location: ${coords.latitude}, ${coords.longitude}`);
    
    return coords;
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

/**
 * Get travel time from user's saved starting location or device's current location
 * Falls back to device location if no saved location exists
 * Returns null if neither is available
 */
export async function getTravelTimeFromDefaultOrigin(
  destination: Coordinate,
  userEmail: string
): Promise<TravelTimeResult | null> {
  try {
    // Get API base URL from environment variables
    const API_BASE = getApiBaseUrl();
    
    let origin: string | Coordinate | null = null;
    let originType: "saved" | "current" = "saved";
    
    // Try to fetch user's saved starting location
    try {
      const response = await fetch(`${API_BASE}/api/user/origin/?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const data = await response.json();
        const savedOrigin = data?.default_origin;
        
        if (savedOrigin && savedOrigin.trim() !== "") {
          origin = savedOrigin;
          console.log(`Using saved starting location: ${savedOrigin}`);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch saved location:", error);
    }
    
    // If no saved origin, don't show travel time (User Story #9 - AC4)
    if (!origin) {
      console.log("No saved starting location - not displaying travel time (per AC4)");
        return null;
    }
    
    // Calculate travel time
    const result = await calculateTravelTime(origin, destination);
    
    if (result) {
      console.log(`Travel time from ${originType} location: ${result.formattedDuration} (${result.formattedDistance})`);
      // Add originType to the result
      return {
        ...result,
        originType
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting travel time:", error);
    return null;
  }
}

