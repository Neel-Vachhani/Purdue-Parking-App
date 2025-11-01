// This file is used to create the text boxes for both the log-in and sign-up pages

import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";

type AuthInputProps = TextInputProps & {
  secure?: boolean;
};

// Template to customize input boxes
export default function AuthInput({ secure, style, ...rest }: AuthInputProps) {
  return (
    <TextInput
      {...rest}
      style={[styles.input, style]}
      placeholderTextColor="#aaa"
      secureTextEntry={secure ?? rest.secureTextEntry}
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