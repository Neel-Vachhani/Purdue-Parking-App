import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AuthInput from '../../components/AuthInput';

export default function SignupScreen({ onSignup }: { onSignup: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
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
      <AuthInput
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm_password}
        onChangeText={setConfirmPassword}
        secure
      />
      {/* User gets loged once "Log in" button is pressed. Later we will need to authenticate user has an account and used correct password */}
      <TouchableOpacity style={styles.button} onPress={onSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
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
});