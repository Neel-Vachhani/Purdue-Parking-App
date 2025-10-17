// This file contains functions to interact with the backend API

// Django backend URL
const API_URL = "http://127.0.0.1:8000";

// Function to create a user account (when they press "sign up" button)
export async function createUserAccount(email: string, password: string) {
  // Send email and password to backend
  const response = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  // If something didn't work correctly
  if (!response.ok) {
    throw new Error("Signup failed");
  }

  return response.json();
}