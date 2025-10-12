import * as React from "react";
import { Platform, Button } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GOOGLE_CLIENT_ID_IOS = "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID_ANDROID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

export function GoogleButton() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "myapp", path: "redirect" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: Platform.select({ ios: GOOGLE_CLIENT_ID_IOS, android: GOOGLE_CLIENT_ID_ANDROID })!,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    discovery
  );

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

  return <Button title="Continue with Google" disabled={!request} onPress={() => promptAsync()} />;
}
