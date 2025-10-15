// This file is used to create the text boxes for both the log-in and sign-up pages

import React from "react";
import { TextInput, StyleSheet } from "react-native";

// Template to customize input boxes
export default function AuthInput({ placeholder, value, onChangeText, secure }: any) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      secureTextEntry={secure}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

// Style of the input box
const styles = StyleSheet.create({
  input: {
    width: "100%",
    backgroundColor: "#1E1E1E",
    color: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
});