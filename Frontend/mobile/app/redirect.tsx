// app/redirect.tsx
import { useEffect } from "react";
import { View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

export default function Redirect() {
  useEffect(() => {
    router.replace("/");
  }, []);

  return <View />;
}
