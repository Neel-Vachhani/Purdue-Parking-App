// components/ThemedIcons.tsx
import React, { useContext } from "react";
import { Ionicons as Ion, MaterialCommunityIcons as Mci } from "@expo/vector-icons";
import { ThemeContext } from "../theme/ThemeProvider";

export function Ionicons(props: React.ComponentProps<typeof Ion>) {
  const theme  = useContext(ThemeContext);
  return <Ion color={props.color ?? theme.text} {...props} />;
}

export function MaterialCommunityIcons(props: React.ComponentProps<typeof Mci>) {
  const theme  = useContext(ThemeContext);
  return <Mci color={props.color ?? theme.text} {...props} />;
}
