import { TouchableOpacity, Image, Text, View } from "react-native";

export default function GoogleLoginButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#dadce0",
        width: "100%",
      }}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
        style={{ width: 18, height: 18, marginRight: 10 }}
      />
      <Text style={{ fontWeight: "500", color: "#3c4043" }}>
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
}
