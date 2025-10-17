import * as React from "react";
import { Platform, Button, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { router } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GOOGLE_CLIENT_ID_IOS = "254023418229-3hj5ada3tl38jfk9p60lu88r6a3j3rk6.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_ANDROID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_WEB = "254023418229-bst7ahhn0aa5201jjd9ft40abma89l27.apps.googleusercontent.com";



const isExpoGo = Constants.executionEnvironment === "storeClient";
const redirectUri = isExpoGo
  ? AuthSession.makeRedirectUri()
  : AuthSession.makeRedirectUri({ scheme: "boilerpark", path: "redirect" });
const clientId = isExpoGo ? GOOGLE_CLIENT_ID_WEB : Platform.select({ ios: GOOGLE_CLIENT_ID_IOS, android: GOOGLE_CLIENT_ID_ANDROID })!;

console.log('clientID', clientId)

export default function GoogleButton() {
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

<<<<<<< HEAD

React.useEffect(() => {
  (async () => {
    if (response?.type === "error") {
      console.log("Auth error params:", response.params);
      Alert.alert("Auth error", JSON.stringify(response.params, null, 2));
      return;
    }
    if (response?.type === "success" && response.params.code) {
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          { code: response.params.code, clientId, redirectUri, extraParams: { code_verifier: request?.codeVerifier ?? "" } },
          discovery
        );
        await SecureStore.setItemAsync("googleTokens", JSON.stringify(tokenRes));
        router.replace("/");
      } catch (e: any) {
        console.log("Exchange error:", e);
        Alert.alert("Google sign-in failed", e?.message ?? "Unknown error");
      }
    }
  })();
}, [response]);
=======
  React.useEffect(() => {
    (async () => {
      if (response?.type === "success" && response.params.code) {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            code: response.params.code,
            clientId: Platform.select({
              ios: GOOGLE_CLIENT_ID_IOS,
              android: GOOGLE_CLIENT_ID_ANDROID,
            })!,
            redirectUri,
            // PKCE:
            extraParams: { code_verifier: request?.codeVerifier ?? "" },
          },
          discovery
        );
        await SecureStore.setItemAsync("googleTokens", JSON.stringify(tokenRes));
      }
    })();
  }, [response]);
>>>>>>> 759985c89d44daba8bd44ba868bc33b079965acd

  return <Button title="Continue with Google" disabled={!request} onPress={() => promptAsync()} />;
}
