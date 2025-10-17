// This file contains functions to interact with the backend API

// Django backend URL
const API_URL = "http://127.0.0.1:8000";

// Function to create a user account (when they press "sign up" button)
export const createUserAccount = async (email: string, password: string) => {
  try {
    // Send email and password to backend
    const response = await fetch(`${API_URL}/signup/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        email: email,
        name: email,  // Using email as username for now
        password: password,
        parking_pass: 'None'  // Default parking pass
      }),
    });

    // If something didn't work correctly
    if (!response.ok) {
      throw new Error("Signup failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating user account:", error);
    throw error;
  }
}

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        email: email,
        password: password,
      }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.text();
    return data === "Login successful";
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};