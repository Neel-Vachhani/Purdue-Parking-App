import React from "react";

import GarageMap from "../../screens/GarageMap/GarageMap";
import NavigationScreen from "../../screens/Navigation/NavigationScreen";
import Calendar from "../../screens/Calender/Calender";
import Combined from "../../screens/Insights/Combined";
import SettingsScreen from "../../screens/Settings/SettingsScreen";
import { Ionicons } from "../ThemedIcons";

export type TabKey = "garages" | "calendar" | "insights" | "navigation" | "settings";

export type TabContentContext = {
  onLogout: () => void;
};

export type TabConfigEntry = {
  key: TabKey;
  label: string;
  deeplink: string;
  renderIcon: (props: { color: string; size: number }) => React.ReactNode;
  renderContent: (ctx: TabContentContext) => React.ReactNode;
};

export const TAB_CONFIG: TabConfigEntry[] = [
  {
    key: "garages",
    label: "Garages",
    deeplink: "garages",
    renderIcon: (props) => <Ionicons name="car-outline" {...props} />,
    renderContent: () => <GarageMap />,
  },
  {
    key: "navigation",
    label: "Navigation",
    deeplink: "navigation",
    renderIcon: (props) => <Ionicons name="navigate-outline" {...props} />,
    renderContent: () => <NavigationScreen />,
  },
  {
    key: "calendar",
    label: "Calendar",
    deeplink: "calendar",
    renderIcon: (props) => <Ionicons name="calendar-outline" {...props} />,
    renderContent: () => <Calendar />,
  },
  {
    key: "insights",
    label: "Insights",
    deeplink: "insights",
    renderIcon: (props) => <Ionicons name="analytics-outline" {...props} />,
    renderContent: () => <Combined />,
  },
  {
    key: "settings",
    label: "Settings",
    deeplink: "settings",
    renderIcon: (props) => <Ionicons name="settings-outline" {...props} />,
    renderContent: ({ onLogout }) => <SettingsScreen onLogout={onLogout} />,
  },
];

export const TAB_KEYS = TAB_CONFIG.map((tab) => tab.key);

export function getTabByKey(key: TabKey) {
  return TAB_CONFIG.find((tab) => tab.key === key);
}

