import React from "react";
import { View, Pressable, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeContext } from "../theme/ThemeProvider";
import { TabConfigEntry, TabKey } from "./navigation/tabConfig";

type Props = {
  tabs: TabConfigEntry[];
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export default function BottomBar({ tabs, active, onChange }: Props) {
  const theme = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = React.useState(0);
  const indicatorX = React.useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === active)
  );
  const segmentWidth = trackWidth > 0 ? trackWidth / tabs.length : 0;
  const activeContentColor = theme.primaryText;
  const inactiveContentColor = theme.textMuted;
  const trackBackground = theme.surfaceMuted;

  React.useEffect(() => {
    if (segmentWidth === 0) {
      indicatorX.setValue(activeIndex * segmentWidth);
      return;
    }
    Animated.spring(indicatorX, {
      toValue: activeIndex * segmentWidth,
      useNativeDriver: true,
      mass: 0.6,
      stiffness: 200,
      damping: 18,
    }).start();
  }, [activeIndex, indicatorX, segmentWidth]);

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: trackBackground,
            borderColor: theme.border,
          },
        ]}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                backgroundColor: theme.primary,
                width: segmentWidth,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const iconColor = isActive ? activeContentColor : inactiveContentColor;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} tab`}
              hitSlop={8}
              onPress={() => {
                if (!isActive) {
                  onChange(tab.key);
                }
              }}
              style={styles.tabButton}
            >
              <View style={styles.tabContent}>
                {tab.renderIcon({ color: iconColor, size: isActive ? 26 : 22 })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  track: {
    flexDirection: "row",
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: "hidden",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
});
