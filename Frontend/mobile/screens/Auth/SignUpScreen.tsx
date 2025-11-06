import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { createUserAccount } from '../../app/utils/api';
import AuthInput from '../../components/AuthInput';

interface SignupScreenProps {
  onSignup: () => void;
  pushToken: string | null;
}

// Function to render the sign-up screen
export default function SignupScreen({ onSignup, pushToken }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Processing create account request from user (after user presses "Sign Up" button)
  const handleSignup = async () => {
    // If user leaves a text field blank
    if (!email || !password || !confirm_password) {
      setError('Please fill in all fields.');
      return;
    }

    // If passwords don't match
    if (password !== confirm_password) {
      setError('Passwords do not match. Try again.');
      return;
    }

    // Execution falls to here -> entered creditials were valid
    // Start loading account creation
    setLoading(true);
    setError('');

    try {
      // Sends user information to the backend
      const userData = await createUserAccount(email, password);
      console.log('User created successfully:', userData);

      // If we have a push token, send it to the backend
      if (pushToken) {
        const tokenResponse = await fetch("http://127.0.0.1:2523/notification_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: email,
            token: pushToken
          }),
        });

        if (!tokenResponse.ok) {
          console.warn('Failed to save notification token');
        }
      }

      // Notify parent component (App.tsx) that user has successfully signed up (route to Log In screen)
      onSignup();
    } catch (err) {
      console.error('Signup error:', err);
      setError('Account creation failed.');
    } finally {
      setLoading(false);
    }
  };  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        inputMode="email"
      />
      <AuthInput
        placeholder="Password"
        secure
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
      />
      <AuthInput
        placeholder="Confirm Password"
        secure
        value={confirm_password}
        onChangeText={setConfirmPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
      />

      {error ? <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}        
      </TouchableOpacity>
    </View>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 28,
    marginBottom: 30,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    color: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4C8BF5',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 10,
  }
});