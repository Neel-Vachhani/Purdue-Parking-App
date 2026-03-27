import { ParkingPass } from "../constants/passes";

export type GarageDefinition = {
  code: string;
  name: string;
  paid?: boolean;
  favorite?: boolean;
  lat: number;
  lng: number;
  passes: ParkingPass[];
  rating: number;
  address: string;
  individual_rating: number;
};

export const GARAGE_DEFINITIONS: GarageDefinition[] = [
  { code: "PGH", name: "Harrison Street Parking Garage", paid: true, favorite: true, lat: 40.420928743577996, lng: -86.91759020145541, passes: ["A", "B", "Paid"], rating: 3.5, address: "719 Clinic Dr, West Lafayette, IN", individual_rating: 2.5 },
  { code: "PGG", name: "Grant Street Parking Garage", paid: true, favorite: true, lat: 40.42519706999441, lng: -86.90972814560583, passes: ["A", "B", "Paid"], rating: 4, address: "120 Grant St, West Lafayette, IN", individual_rating: 0 },
  { code: "PGU", name: "University Street Parking Garage", paid: true, lat: 40.4266903911869, lng: -86.91728093292815, passes: ["A", "SG", "Paid"], rating: 3, address: "201 N University St, West Lafayette, IN", individual_rating: 0 },
  { code: "PGNW", name: "Northwestern Avenue Parking Garage", paid: true, lat: 40.42964447741563, lng: -86.91111021483658, passes: ["A", "SG", "Paid"], rating: 5, address: "504 Northwestern Ave, West Lafayette, IN", individual_rating: 0 },
  { code: "PGMD", name: "McCutcheon Drive Parking Garage", paid: true, lat: 40.43185, lng: -86.91445, passes: ["Residence Hall", "Paid"], rating: 2, address: "250 McCutcheon Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "PGW", name: "Wood Street Parking Garage", paid: true, lat: 40.42785, lng: -86.91885, passes: ["A", "SG", "Paid"], rating: 2, address: "120 S. Grant St., West Lafayette, IN", individual_rating: 0 },
  { code: "PGM", name: "Marsteller Street Parking Garage", paid: true, lat: 40.42545, lng: -86.91325, passes: ["A", "Paid"], rating: 2, address: "112 Marsteller St, West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_R", name: "Lot R (North of Ross-Ade)", lat: 40.41445, lng: -86.91245, passes: ["A", "B", "C"], rating: 2, address: "850 Steven Beering Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_H", name: "Lot H (West of Football Practice Field)", lat: 40.41625, lng: -86.91485, passes: ["A", "B", "C"], rating: 2, address: "Address coming from API", individual_rating: 0 },
  { code: "LOT_FB", name: "Lot FB (East of Football Practice Field)", lat: 40.41585, lng: -86.91135, passes: ["A", "B"], rating: 2, address: "Address coming from API", individual_rating: 0 },
  { code: "KFPC", name: "Kozuch Football Performance Complex Lot", lat: 40.41525, lng: -86.91055, passes: ["A", "B"], rating: 2, address: "1228 John R Wooden Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_A", name: "Lot A (North of Cary Quad)", lat: 40.42845, lng: -86.92045, passes: ["A", "B"], rating: 2, address: "A Lot, West Lafayette, IN", individual_rating: 0 },
  { code: "CREC", name: "Co-Rec Parking Lots", lat: 40.42185, lng: -86.91965, passes: ["A", "B", "C"], rating: 2, address: "355 N Martin Jischke Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_O", name: "Lot O (East of Rankin Track)", lat: 40.41925, lng: -86.91845, passes: ["A", "B", "C"], rating: 2, address: "1205 W Stadium Ave, West Lafayette, IN", individual_rating: 0 },
  { code: "TARK_WILY", name: "Tarkington & Wiley Lots", lat: 40.43045, lng: -86.92125, passes: ["A", "B"], rating: 2, address: "500 N Martin Jischke Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_AA", name: "Lot AA (6th & Russell)", lat: 40.42655, lng: -86.90585, passes: ["A", "B"], rating: 2, address: "520 North Russell Street West Lafayette, IN", individual_rating: 0 },
  { code: "LOT_BB", name: "Lot BB (6th & Waldron)", lat: 40.42545, lng: -86.90485, passes: ["A", "B"], rating: 2, address: "Address coming from API", individual_rating: 0 },
  { code: "WND_KRACH", name: "Windsor & Krach Shared Lot", lat: 40.43165, lng: -86.91845, passes: ["A", "B"], rating: 2, address: "205 N Russell St, West Lafayette, IN", individual_rating: 0 },
  { code: "SHRV_ERHT_MRDH", name: "Shreve, Earhart & Meredith Shared Lot", lat: 40.43265, lng: -86.92265, passes: ["A", "B"], rating: 2, address: "1275 3rd Street, West Lafayette, IN", individual_rating: 0 },
  { code: "MCUT_HARR_HILL", name: "McCutcheon, Harrison & Hillenbrand Lot", lat: 40.43225, lng: -86.91565, passes: ["A", "B"], rating: 2, address: "400 McCutcheon Dr, West Lafayette, IN", individual_rating: 0 },
  { code: "DUHM", name: "Duhme Hall Parking Lot", lat: 40.43385, lng: -86.91925, passes: ["A", "B"], rating: 2, address: "209 N Russell St, West Lafayette, IN", individual_rating: 0 },
  { code: "PIERCE_ST", name: "Pierce Street Parking Lot", paid: true, lat: 40.42385, lng: -86.91445, passes: ["A", "B", "Paid"], rating: 2, address: "134 Pierce St., West Lafayette, IN", individual_rating: 0 },
  { code: "SMTH_BCHM", name: "Smith & Biochemistry Lot", lat: 40.42745, lng: -86.91665, passes: ["A"], rating: 2, address: "175 S University St, West Lafayette, IN", individual_rating: 0 },
  { code: "DISC_A", name: "Discovery Lot (A Permit)", lat: 40.428997605924756, lng: -86.91608038169943, passes: ["A"], rating: 2, address: "625 Harrison St, West Lafayette, IN", individual_rating: 0 },
  { code: "DISC_AB", name: "Discovery Lot (AB Permit)", lat: 40.42865, lng: -86.91545, passes: ["A", "B"], rating: 2, address: "625 Harrison St, West Lafayette, IN", individual_rating: 0 },
  { code: "DISC_ABC", name: "Discovery Lot (ABC Permit)", lat: 40.42825, lng: -86.91485, passes: ["A", "B", "C"], rating: 2, address: "625 Harrison St, West Lafayette, IN", individual_rating: 0 },
  { code: "AIRPORT", name: "Airport Parking Lots", lat: 40.41225, lng: -86.93685, passes: ["A", "B", "C"], rating: 2, address: "501 Aviation Dr, West Lafayette, IN", individual_rating: 0 },
];
