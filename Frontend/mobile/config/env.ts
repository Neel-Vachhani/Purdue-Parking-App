// config/env.ts
// Centralized environment configuration
import { Platform } from 'react-native';

/**
 * Get the backend API base URL based on platform
 * Uses environment variables with fallback defaults for development
 */
export const getApiBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID || 'http://10.0.2.2:7500';
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL_IOS || 'http://localhost:7500';
};

/**
 * Get Google Maps API key from environment variables
 * 
 * NOTE: This is OPTIONAL and only needed for the GooglePlacesInput search component.
 * The travel time feature (geocoding) now uses the backend API and doesn't need this key.
 * 
 * If you don't need the places search feature, you can skip setting this key.
 * Should be restricted in Google Cloud Console to your app's bundle ID if used.
 */
export const getGoogleMapsApiKey = (): string => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('ℹ️  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set (optional - only needed for places search)');
    return '';
  }
  
  return apiKey;
};

// Export constants for backward compatibility
export const API_BASE_URL = getApiBaseUrl();
export const GOOGLE_MAPS_API_KEY = "AIzaSyCfaUk1N-1QssXzg-ccL0pNJQH8xhUBdzY"
