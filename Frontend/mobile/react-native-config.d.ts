declare module 'react-native-config' {
  export interface NativeConfig {
      GOOGLE_MAPS_URL: string;
      GOOGLE_MAPS_API: string;
  }
  
  export const Config: NativeConfig
  export default Config
}