import React, { createContext, useContext, useState, useEffect } from 'react';
import { Location } from '../types/index.js';
import { api } from '../services/api.js';

interface LocationContextType {
  locations: Location[];
  selectedLocationId: string; // 'ALL' or specific id
  setSelectedLocationId: (id: string) => void;
  selectedLocation: Location | null;
  refreshLocations: () => Promise<void>;
  loading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  const refreshLocations = async () => {
    try {
      const res = await api.getLocations();
      setLocations(res.locations);
    } catch (err) {
      console.error('Failed to load locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLocations();
  }, []);

  const selectedLocation = locations.find(l => l.id === selectedLocationId) || null;

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocationId,
        setSelectedLocationId,
        selectedLocation,
        refreshLocations,
        loading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
