export type PassPricing = {
  passType: string;
  label: string;
  previousPrice: number;  
  currentPrice: number;   
  onSale: boolean;        
};

export const PASS_PRICING: PassPricing[] = [
  {
    passType: "A",
    label: "A Permit (Faculty/Staff)",
    previousPrice: 360,
    currentPrice: 280,   
    onSale: true,
  },
  {
    passType: "B",
    label: "B Permit (Student)",
    previousPrice: 240,
    currentPrice: 240,   
    onSale: false,
  },
  {
    passType: "C",
    label: "C Permit (Remote Lots)",
    previousPrice: 120,
    currentPrice: 120,   
    onSale: false,
  },
  {
    passType: "SG",
    label: "SG Permit (Garage Access)",
    previousPrice: 300,
    currentPrice: 280,   
    onSale: false,
  },
  {
    passType: "Paid",
    label: "Paid Parking (per hour)",
    previousPrice: 1.50,
    currentPrice: 1.50,  
    onSale: false,
  },
  {
    passType: "Residence Hall",
    label: "Residence Hall Permit",
    previousPrice: 180,
    currentPrice: 180,   
    onSale: false,
  },
];


export const CURRENT_PRICES: Record<string, number> = PASS_PRICING.reduce(
  (acc, p) => ({ ...acc, [p.passType]: p.currentPrice }),
  {} as Record<string, number>
);

export const PREVIOUS_PRICES: Record<string, number> = PASS_PRICING.reduce(
  (acc, p) => ({ ...acc, [p.passType]: p.previousPrice }),
  {} as Record<string, number>
);