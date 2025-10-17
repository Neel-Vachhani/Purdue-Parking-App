// screens/Auth/AuthScreen.tsx
import React, { useState, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import AuthInput from "../../components/AuthInput";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";


import axios from "axios";
import GoogleLoginButton from "../../components/GoogleLoginButton";

// platform-safe base URL:
// - iOS Simulator: http://localhost:7500
// - Android Emulator: http://10.0.2.2:7500
// - Physical device: use your laptop's LAN IP, e.g., http://192.168.1.23:7500
const API_BASE =
  Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";


WebBrowser.maybeCompleteAuthSession();

interface Props {
  pushToken: string | null;
  onAuthed: () => void; // call after successful login/signup
}

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GOOGLE_CLIENT_ID_WEB =
  "254023418229-bst7ahhn0aa5201jjd9ft40abma89l27.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_IOS =
  "254023418229-3hj5ada3tl38jfk9p60lu88r6a3j3rk6.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_ANDROID =
  "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

export default function AuthScreen({ pushToken, onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const saveSessionAndContinue = async (token: string, user?: any) => {
    await SecureStore.setItemAsync("sessionToken", token);
    if (user) {
      await SecureStore.setItemAsync("user", JSON.stringify(user));
    }
    onAuthed();
  };

 async function handlePrimary() {
    if (submitting) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "signup") {
        const res = await axios.post(`${API_BASE}/signup/`, {
          email,
          password,
          name: email,
          push_token: pushToken ?? null,
        });
        // Expecting { token, user }
        const { token, user } = res.data || {};
        await saveSessionAndContinue(token ?? "ok", user);
        return;
      }

      // login
      const res = await axios.post(`${API_BASE}/login/`, {
        email,
        password,
      });
      const { token, user } = res.data || {};
      await saveSessionAndContinue(token ?? "ok", user);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        (mode === "signup" ? "Signup failed" : "Login failed");
      Alert.alert(mode === "signup" ? "Signup error" : "Login error", String(msg));
    } finally {
      setSubmitting(false);
    }
  }
  async function handleApple() {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Send token + user info to backend for verification and session creation
    const res = await axios.post(`${API_BASE}/apple/`, {
      identity_token: cred.identityToken,  // JWT from Apple
      user: cred.user,                     // Apple user ID
      full_name: cred.fullName ?? null,    // optional
      email: cred.email ?? null,           // optional
      push_token: pushToken ?? null,
    });

    const { token, user } = res.data || {};
    await SecureStore.setItemAsync("sessionToken", token ?? "apple_ios");
    if (user) await SecureStore.setItemAsync("user", JSON.stringify(user));

    onAuthed(); // continue to main app
  } catch (e: any) {
    if (e?.code !== "ERR_CANCELED") {
      Alert.alert("Apple Sign-In failed", e?.message ?? "Unknown error");
    }
  }
}

  // ---------- Google OAuth (expo-auth-session) ----------
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  const clientId = useMemo(
    () =>
      isExpoGo
        ? GOOGLE_CLIENT_ID_WEB // Expo Go uses the web client id
        : Platform.select({ ios: GOOGLE_CLIENT_ID_IOS, android: GOOGLE_CLIENT_ID_ANDROID })!,
    [isExpoGo]
  );

  // NOTE: Make sure you have "scheme": "boilerpark" in app.json
  const redirectUri = useMemo(
    () =>
      isExpoGo
        ? // Your Expo project page (Accounts → Projects → Auth)
          "https://auth.expo.dev/@utkarsh-m/boilerpark"
        : AuthSession.makeRedirectUri({ scheme: "boilerpark", path: "redirect" }),
    [isExpoGo]
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    discovery
  );

  useEffect(() => {
    (async () => {
      if (!response) return;

      if (response.type === "error") {
        Alert.alert("Google Auth Error", JSON.stringify(response.params, null, 2));
        return;
      }

      if (response.type === "success" && response.params.code) {
        try {
          const tokenRes = await AuthSession.exchangeCodeAsync(
            {
              code: response.params.code,
              clientId,
              redirectUri,
              extraParams: { code_verifier: request?.codeVerifier ?? "" },
            },
            discovery
          );

          // You can verify on your backend instead:
          // await axios.post("https://your.api/auth/google", { id_token: tokenRes.idToken, push_token: pushToken })

          const idToken = (tokenRes as any)?.idToken;
          if (!idToken) throw new Error("Missing idToken from Google");

          await SecureStore.setItemAsync("sessionToken", idToken);
          onAuthed();
        } catch (e: any) {
          Alert.alert("Google sign-in failed", e?.message ?? "Unknown error");
        }
      }
    })();
  }, [response]);

  const handleGoogle = async () => {
    try {
      await promptAsync();
    } catch (e: any) {
      Alert.alert("Google prompt failed", e?.message ?? "Unknown error");
    }
  };
  // ------------------------------------------------------

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        {mode === "login" ? "Log In" : "Create Account"}
      </ThemedText>

      <AuthInput placeholder="Email" value={email} onChangeText={setEmail} />
      <AuthInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Primary action: Log In or Sign Up */}
      <TouchableOpacity style={styles.primaryButton} onPress={handlePrimary}>
        <Text style={styles.primaryText}>
          {mode === "login" ? "Log In" : "Sign Up"}
        </Text>
      </TouchableOpacity>

      {/* Secondary outlined switcher */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={styles.secondaryText}>
          {mode === "login" ? "Need an account? Sign Up" : "Have an account? Log In"}
        </Text>
      </TouchableOpacity>

      {/* Google Sign-In */}
      <GoogleLoginButton onPress={handleGoogle} />

      {Platform.OS === "ios" && (
        <View style={{ width: "100%", marginTop: 12 }}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={{ width: "100%", height: 44 }}
            onPress={handleApple}
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212", padding: 20, gap: 12 },
  title: { color: "white", fontSize: 28, marginBottom: 20, fontWeight: "bold" },
  primaryButton: { backgroundColor: "#4C8BF5", paddingVertical: 12, width: "100%", borderRadius: 10, alignItems: "center", marginTop: 10 },
  primaryText: { color: "white", fontWeight: "600", fontSize: 16 },
  secondaryButton: { width: "100%", borderWidth: 1.5, borderColor: "#4C8BF5", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  secondaryText: { color: "#4C8BF5", fontWeight: "600", fontSize: 16 },
  googleButton: { width: "100%", borderWidth: 1.5, borderColor: "#DB4437", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  googleText: { color: "#DB4437", fontWeight: "700", fontSize: 16 },
});
