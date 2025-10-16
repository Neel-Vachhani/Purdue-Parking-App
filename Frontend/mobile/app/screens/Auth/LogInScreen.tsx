import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AuthInput from '../../components/AuthInput';
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

interface LoginScreenProps {
    onLogin: () => void;
    onRequestSignup: () => void;
}

export default function LoginScreen({ onLogin, onRequestSignup }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

//   const handleLogin = () => {
//     console.log('Email:', email);
//     console.log('Password:', password);
//   };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Log In</ThemedText>
      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <AuthInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        secure
      />
      {/* User gets loged once "Log in" button is pressed. Later we will need to authenticate user has an account and used correct password */}
      <TouchableOpacity style={styles.button} onPress={onLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onRequestSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </ThemedView>
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
});