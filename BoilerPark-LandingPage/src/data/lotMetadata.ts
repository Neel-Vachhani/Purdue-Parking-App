export type LotMetadata = {
  address: string;
  permits: string[];
  category: "Garage" | "Surface Lot";
  payment: "Paid" | "Permit";
};

export const LOT_METADATA: Record<string, LotMetadata> = {
  PGH: {
    address: "719 Clinic Dr, West Lafayette, IN",
    permits: ["A", "B", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGG: {
    address: "120 Grant St, West Lafayette, IN",
    permits: ["A", "B", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGU: {
    address: "201 N University St, West Lafayette, IN",
    permits: ["A", "SG", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGNW: {
    address: "504 Northwestern Ave, West Lafayette, IN",
    permits: ["A", "SG", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGMD: {
    address: "250 McCutcheon Dr, West Lafayette, IN",
    permits: ["Residence Hall", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGW: {
    address: "120 S Grant St, West Lafayette, IN",
    permits: ["A", "SG", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGGH: {
    address: "Graduate House area, West Lafayette, IN",
    permits: ["A", "B", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  PGM: {
    address: "112 Marsteller St, West Lafayette, IN",
    permits: ["A", "Paid"],
    category: "Garage",
    payment: "Paid",
  },
  LOT_R: {
    address: "850 Steven Beering Dr, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_H: {
    address: "North of Football Practice Field, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_FB: {
    address: "East of Football Practice Field, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  KFPC: {
    address: "1228 John R Wooden Dr, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_A: {
    address: "A Lot, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  CREC: {
    address: "355 N Martin Jischke Dr, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_O: {
    address: "1205 W Stadium Ave, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
  TARK_WILY: {
    address: "500 N Martin Jischke Dr, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_AA: {
    address: "520 N Russell St, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  LOT_BB: {
    address: "6th and Waldron area, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  WND_KRACH: {
    address: "205 N Russell St, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  SHRV_ERHT_MRDH: {
    address: "1275 3rd St, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  MCUT_HARR_HILL: {
    address: "400 McCutcheon Dr, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  DUHM: {
    address: "209 N Russell St, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  PIERCE_ST: {
    address: "134 Pierce St, West Lafayette, IN",
    permits: ["A", "B", "Paid"],
    category: "Surface Lot",
    payment: "Paid",
  },
  SMTH_BCHM: {
    address: "175 S University St, West Lafayette, IN",
    permits: ["A"],
    category: "Surface Lot",
    payment: "Permit",
  },
  DISC_A: {
    address: "625 Harrison St, West Lafayette, IN",
    permits: ["A"],
    category: "Surface Lot",
    payment: "Permit",
  },
  DISC_AB: {
    address: "625 Harrison St, West Lafayette, IN",
    permits: ["A", "B"],
    category: "Surface Lot",
    payment: "Permit",
  },
  DISC_ABC: {
    address: "625 Harrison St, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
  AIRPORT: {
    address: "501 Aviation Dr, West Lafayette, IN",
    permits: ["A", "B", "C"],
    category: "Surface Lot",
    payment: "Permit",
  },
};

export function getLotMetadata(code: string | undefined, name: string): LotMetadata {
  const key = typeof code === "string" ? code.toUpperCase() : "";

  if (key && LOT_METADATA[key]) {
    return LOT_METADATA[key];
  }

  const looksLikeGarage = /garage/i.test(name);
  return {
    address: "Purdue campus, West Lafayette, IN",
    permits: ["A"],
    category: looksLikeGarage ? "Garage" : "Surface Lot",
    payment: looksLikeGarage ? "Paid" : "Permit",
  };
}
