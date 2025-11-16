import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface EmptyStateProps {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
  actionText?: string;
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName,
  title,
  message,
  actionText,
  onActionPress,
}) => {
  return (
    <ThemedView style={styles.container}>
      <Ionicons name={iconName} size={72} color="#c4c4c4" />
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      {actionText && onActionPress && (
        <View style={styles.buttonWrapper}>
          <View style={styles.button}>
            <ThemedText style={styles.buttonText} onPress={onActionPress}>
              {actionText}
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 280,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    textAlign: "center",
    opacity: 0.8,
  },
  buttonWrapper: {
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#c28e0e",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});


