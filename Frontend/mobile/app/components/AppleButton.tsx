import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export function AppleButton() {
  if (Platform.OS !== "ios") return null;
  const signIn = async () => {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    // Send cred.identityToken to your backend to verify with Apple, then create a session.
    await SecureStore.setItemAsync("appleIdentity", JSON.stringify(cred));
  };
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={6}
      style={{ width: "100%", height: 44 }}
      onPress={signIn}
    />
  );
}
