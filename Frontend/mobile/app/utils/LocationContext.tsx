import React, { createContext, useState } from 'react';

type UserLocation = {
  latitude: number | null;
  longitude: number | null;
};

type LocationContextType = {
  location: UserLocation;
  setLocation: React.Dispatch<React.SetStateAction<UserLocation>>;
};

export const LocationContext = createContext<LocationContextType>(
  null as unknown as LocationContextType,
);

type LocationProviderProps = {
  children: React.ReactNode;
};

export const LocationProvider = ({ children }: LocationProviderProps) => {
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
  });

  const value = {
    location,
    setLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

