// screens/Auth/AuthScreen.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import AuthInput from "../../components/AuthInput";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { EmailContext } from "../../utils/EmailContext";
import axios from "axios";
import { API_BASE_URL } from "../../config/env";

const API_BASE = API_BASE_URL;

WebBrowser.maybeCompleteAuthSession();

interface Props {
  pushToken: string | null;
  onAuthed: () => void;
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
const GOOGLE_CLIENT_ID_ANDROID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

// Purdue palette (approx)
const PURDUE_GOLD = "#CFB991";
const PURDUE_BLACK = "#000000";
const PURDUE_DARK = "#0B0B0C";
const PURDUE_STEEL = "#94A3B8"; // subtle neutral

export default function AuthScreen({ pushToken, onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userEmail = React.useContext(EmailContext);

  useEffect(() => {
    userEmail.setUserEmail("This is my email");
  }, []);

  // simple dynamic accent: soft pulse to make the screen feel alive
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 1000), 60);
    return () => clearInterval(id);
  }, []);
  const glowOpacity = 0.10 + 0.08 * Math.sin(pulse / 40);

  const saveSessionAndContinue = async (token: string, user?: any) => {
    await SecureStore.setItemAsync("sessionToken", token);
    if (user) await SecureStore.setItemAsync("user", JSON.stringify(user));
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
        const { token, user } = res.data || {};
        await saveSessionAndContinue(token ?? "ok", user);
        return;
      }

      const res = await axios.post(`${API_BASE}/login/`, { email, password });
      const { token, user } = res.data || {};
      userEmail.setUserEmail(email);
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

      const res = await axios.post(`${API_BASE}apple/`, {
        identity_token: cred.identityToken,
        user: cred.user,
        full_name: cred.fullName ?? null,
        email: cred.email ?? null,
        push_token: pushToken ?? null,
      });

      const { token, user } = res.data || {};
      await SecureStore.setItemAsync("sessionToken", token ?? "apple_ios");
      if (user) await SecureStore.setItemAsync("user", JSON.stringify(user));
      onAuthed();
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED") {
        Alert.alert("Apple Sign-In failed", e?.message ?? "Unknown error");
      }
    }
  }

  const isExpoGo = Constants.executionEnvironment === "storeClient";

  const clientId = useMemo(
    () =>
      isExpoGo
        ? GOOGLE_CLIENT_ID_WEB
        : Platform.select({ ios: GOOGLE_CLIENT_ID_IOS, android: GOOGLE_CLIENT_ID_ANDROID })!,
    [isExpoGo]
  );

  const redirectUri = useMemo(
    () =>
      isExpoGo
        ? "https://auth.expo.dev/@utkarsh-m/boilerpark"
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

  return (
    <ThemedView style={styles.container}>
      {/* Dynamic background accents (Expo-safe) */}
      <View pointerEvents="none" style={[styles.bgGlowTop, { opacity: glowOpacity }]} />
      <View pointerEvents="none" style={[styles.bgGlowBottom, { opacity: glowOpacity * 0.9 }]} />

      <View style={styles.card}>
        <View style={styles.brandRow}>
          {/* Replace with your own logo asset if you have one */}
          {/* <Image source={require("../../assets/boilerpark-mark.png")} style={styles.logo} /> */}
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.brandTitle}>BoilerPark</ThemedText>
            <Text style={styles.brandSubtitle}>Purdue parking, live and reliable</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PURDUE</Text>
          </View>
        </View>

        <ThemedText style={styles.title}>
          {mode === "login" ? "Log in" : "Create account"}
        </ThemedText>

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

        <TouchableOpacity
          style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
          onPress={handlePrimary}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryText}>
            {submitting ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In (optional) */}
        {/* <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} activeOpacity={0.9}>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity> */}

        {Platform.OS === "ios" && (
          <View style={{ width: "100%", marginTop: 12 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: "100%", height: 46 }}
              onPress={handleApple}
            />
          </View>
        )}
      </View>

      <Text style={styles.footer}>
        By continuing, you agree to BoilerPark’s Terms and Privacy Policy.
      </Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURDUE_DARK,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  // “dynamic” gold glow blobs (no gradients lib required)
  bgGlowTop: {
    position: "absolute",
    top: -120,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: PURDUE_GOLD,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: -160,
    left: -160,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: PURDUE_GOLD,
  },

  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#111113",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(207,185,145,0.25)",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brandTitle: { color: "white", fontSize: 18, fontWeight: "900", letterSpacing: 0.2 },
  brandSubtitle: { color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(207,185,145,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(207,185,145,0.30)",
  },
  badgeText: { color: PURDUE_GOLD, fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },

  title: { color: "white", fontSize: 26, marginBottom: 12, fontWeight: "900" },

  primaryButton: {
    backgroundColor: PURDUE_GOLD,
    paddingVertical: 13,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: { color: PURDUE_BLACK, fontWeight: "900", fontSize: 16 },

  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(207,185,145,0.55)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { color: PURDUE_GOLD, fontWeight: "800", fontSize: 15 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(148,163,184,0.35)" },
  dividerText: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700" },

  googleButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(207,185,145,0.55)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  googleText: { color: PURDUE_GOLD, fontWeight: "800", fontSize: 15 },

  footer: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    textAlign: "center",
    maxWidth: 520,
    paddingHorizontal: 10,
  },
});