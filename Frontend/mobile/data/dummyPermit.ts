//dummy data to trigger parking pass notifications

export type UserPermit = {
  type: string;         //A,B,C,etc
  expirationDate: string; //y m d
  purchaseDate: string;
};


export const USER_PERMIT: UserPermit = {
  type: "A",
  expirationDate: "2026-02-26",  //
  purchaseDate: "2025-08-15"
};