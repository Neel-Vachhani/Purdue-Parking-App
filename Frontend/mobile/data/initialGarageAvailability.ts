import { GARAGE_DEFINITIONS } from "./garageDefinitions";
import { ParkingPass } from "../constants/passes";

export type InitialGarage = {
  id: string;
  code: string;
  name: string;
  current: number;
  total: number;
  paid?: boolean;
  favorite?: boolean;
  lat: number;
  lng: number;
  passes: ParkingPass[];
  rating: number;
  address: string;
  individual_rating: number;
};

const getTestAvailabilityForCode = (
  code: string
): { current: number; total: number } => {
  switch (code.toUpperCase()) {
    case "PGH":
      return { current: 0, total: 480 };
    case "PGG":
      return { current: 3, total: 650 };
    case "PGU":
      return { current: 1, total: 820 };
    default:
      return { current: 150, total: 400 };
  }
};

export const INITIAL_GARAGES: InitialGarage[] = GARAGE_DEFINITIONS.map((definition, index) => {
  const { current, total } = getTestAvailabilityForCode(definition.code);

  return {
    id: String(index + 1),
    code: definition.code,
    name: definition.name,
    current,
    total,
    paid: definition.paid,
    favorite: definition.favorite,
    lat: definition.lat,
    lng: definition.lng,
    passes: definition.passes,
    rating: definition.rating,
    address: definition.address,
    individual_rating: definition.individual_rating,
  };
});

export const INITIAL_GARAGE_LOOKUP = INITIAL_GARAGES.reduce(
  (acc, garage) => acc.set(garage.code.toUpperCase(), garage),
  new Map<string, InitialGarage>()
);
