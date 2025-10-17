export interface ParkingLocation {
  id: string;
  title: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

export const PARKING_LOCATIONS: ParkingLocation[] = [
  {
    id: '1',
    title: 'Harrison Garage',
    coordinate: {
      latitude: 40.420928743577996,
      longitude: -86.91759020145541
    },
    description: ''
  },
  {
    id: '2',
    title: 'Grant Street Garage',
    coordinate: {
      latitude: 40.42519706999441,
      longitude: -86.90972814560583
    },
    description: ''
  },
  {
    id: '3',
    title: 'University Street Garage',
    coordinate: {
      latitude: 40.4266903911869,
      longitude: -86.91728093292815
    },
    description: ''
  },
  {
    id: '4',
    title: 'Northwestern Garage',
    coordinate: {
      latitude: 40.42964447741563,
      longitude: -86.91111021483658
    },
    description: ''
  },
  {
    id: '5',
    title: 'DS/AI Lot',
    coordinate: {
      latitude: 40.428997605924756,
      longitude: -86.91608038169943
    },
    description: 'Northwestern Avenue Parking Garage'
  },
  // Add more parking locations as needed
];