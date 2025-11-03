export interface UserPreferences {
  theme: "light" | "dark";
  adaFilterEnabled: boolean;
  minAdaSpaces: number;
  // Add more preferences as needed
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}