import React from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";
import ThemedText from "./ThemedText";
import { Ionicons } from "./ThemedIcons";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export type EmptyStateProps = {
  title: string;
  description?: string;
  iconName?: IconName;
  icon?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Reusable empty-state presentation with optional icon and actions.
 * Mirrors the spacing/corner radius of garage cards so it feels native.
 */
export default function EmptyState({
  title,
  description,
  iconName = "alert-circle-outline",
  icon,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  testID,
}: EmptyStateProps) {
  const theme = React.useContext(ThemeContext);
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fade, title, description]);

  const translateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const surfaceColor =
    theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const borderColor =
    theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const mutedText =
    theme.mode === "dark" ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.65)";
  const buttonTextColor = theme.mode === "dark" ? "#111827" : "#111827";
  const iconColor =
    theme.mode === "dark" ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.65)";

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.container,
        {
          opacity: fade,
          transform: [{ translateY }],
          backgroundColor: surfaceColor,
          borderColor,
        },
        style,
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.iconWrapper}>
        {icon ? (
          icon
        ) : (
          <Ionicons name={iconName} size={46} color={iconColor} />
        )}
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {description ? (
        <ThemedText style={[styles.description, { color: mutedText }]}>
          {description}
        </ThemedText>
      ) : null}

      {primaryActionLabel && onPrimaryAction ? (
        <TouchableOpacity
          onPress={onPrimaryAction}
          accessibilityRole="button"
          style={[
            styles.primaryAction,
            { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          <ThemedText
            style={[styles.primaryLabel, { color: buttonTextColor }]}
          >
            {primaryActionLabel}
          </ThemedText>
        </TouchableOpacity>
      ) : null}

      {secondaryActionLabel && onSecondaryAction ? (
        <TouchableOpacity
          onPress={onSecondaryAction}
          accessibilityRole="button"
          style={[
            styles.secondaryAction,
            {
              borderColor,
            },
          ]}
        >
          <ThemedText style={[styles.secondaryLabel, { color: mutedText }]}>
            {secondaryActionLabel}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
    gap: 12,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryAction: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 180,
    alignItems: "center",
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryAction: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 160,
    alignItems: "center",
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});

