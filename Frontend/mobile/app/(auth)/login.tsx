// app/(auth)/login.tsx
import * as React from "react";
import { View, Text, Platform, Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import axios from "axios";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GOOGLE_CLIENT_ID_WEB = "254023418229-bst7ahhn0aa5201jjd9ft40abma89l27.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_IOS = "254023418229-3hj5ada3tl38jfk9p60lu88r6a3j3rk6.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_ANDROID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

const API_URL = "http://localhost:3000/auth/";

export default function Login() {
  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const clientId = isExpoGo
    ? GOOGLE_CLIENT_ID_WEB
    : Platform.select({ ios: GOOGLE_CLIENT_ID_IOS, android: GOOGLE_CLIENT_ID_ANDROID })!;

  const redirectUri = isExpoGo
    ? "https://auth.expo.dev/@utkarsh-m/boilerpark"
    : AuthSession.makeRedirectUri({ scheme: "boilerpark", path: "redirect" });

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

  React.useEffect(() => {
    (async () => {
      if (response?.type === "error") {
        Alert.alert("Auth error", JSON.stringify(response.params, null, 2));
        return;
      }
      if (response?.type === "success" && response.params.code) {
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

          const idToken = tokenRes.idToken;
          if (!idToken) throw new Error("Missing idToken from Google");

          const res = await axios.post(API_URL, { id_token: idToken });
          const { token, user } = res.data;

          await SecureStore.setItemAsync("sessionToken", token);
          await SecureStore.setItemAsync("user", JSON.stringify(user));

          router.replace("/");

        } catch (e: any) {
          console.error("Google login failed:", e.response?.data || e.message);
          Alert.alert("Google sign-in failed", e?.message ?? "Unknown error");
        }
      }
    })();
  }, [response]);

  const signInWithApple = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send Apple identityToken to backend
      const res = await axios.post("http://localhost:3000/auth/apple", {
        identity_token: cred.identityToken,
      });
      const { token, user } = res.data;

      await SecureStore.setItemAsync("sessionToken", token);
      await SecureStore.setItemAsync("user", JSON.stringify(user));

      router.replace("/");
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED")
        Alert.alert("Apple sign-in failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
        Sign in
      </Text>


      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={6}
          style={{ width: "100%", height: 44 }}
          onPress={signInWithApple}
        />
      )}
    </View>
  );
}
