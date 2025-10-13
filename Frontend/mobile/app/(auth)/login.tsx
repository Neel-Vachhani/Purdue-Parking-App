// app/(auth)/login.tsx
import * as React from "react";
import { View, Text, Button, Platform, Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_IOS = "afjsosjod.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_ANDROID = "afjsosjod.apps.googleusercontent.com";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function Login() {
  // Use your app scheme; path is optional but recommended for clarity
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "myapp", path: "redirect" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: Platform.select({
        ios: GOOGLE_CLIENT_ID_IOS,
        android: GOOGLE_CLIENT_ID_ANDROID,
      })!,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      // Ask Google for a refresh token on first consent
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    discovery
  );

  React.useEffect(() => {
    (async () => {
      if (response?.type === "success" && response.params.code) {
        try {
          // Exchange code for tokens using PKCE
          const tokenRes = await AuthSession.exchangeCodeAsync(
            {
              code: response.params.code,
              clientId: Platform.select({
                ios: GOOGLE_CLIENT_ID_IOS,
                android: GOOGLE_CLIENT_ID_ANDROID,
              })!,
              redirectUri,
              extraParams: { code_verifier: request?.codeVerifier ?? "" },
            },
            discovery
          );
          await SecureStore.setItemAsync("googleTokens", JSON.stringify(tokenRes));

          router.replace("/"); 
        } catch (e: any) {
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

      await SecureStore.setItemAsync("appleIdentity", JSON.stringify(cred));

      router.replace("/");
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED") {
        Alert.alert("Apple sign-in failed", e?.message ?? "Unknown error");
      }
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
        Sign in
      </Text>

      <Button title="Continue with Google" disabled={!request} onPress={() => promptAsync()} />

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
