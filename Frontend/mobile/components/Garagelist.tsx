// components/GarageList.tsx
import * as React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router/build/exports";
import { ThemeContext } from "../theme/ThemeProvider";

type Garage = {
  id: string;
  name: string;
  current: number;   
  total: number;     
  favorite?: boolean;
  lat?: number;
  lng?: number;
};


const SAMPLE: Garage[] = [
  { id: "1", name: "Harrison Garage", current: 8, total: 240, favorite: true },
  { id: "2", name: "Grant Street Garage", current: 158, total: 240, favorite: true },
  { id: "3", name: "University Street Garage", current: 70, total: 240 },
  { id: "4", name: "Northwestern Garage", current: 240, total: 240 },
  { id: "5", name: "DSAI Lot", current: 32, total: 38 },
];

export default function GarageList({
  data = SAMPLE,
  onToggleFavorite,
  onOpenInMaps,
}: {
  data?: Garage[];
  onToggleFavorite?: (g: Garage) => void;
  onOpenInMaps?: (g: Garage) => void;
}) {

  const [time, setTime] = React.useState<Date>(new Date());

  const theme = React.useContext(ThemeContext);

  React.useEffect(() => {
        setTime(new Date());
    }, []);

  const renderItem = ({ item }: { item: Garage }) => {
    const pct = Math.min(item.current / item.total, 1);
    const colors = getColors(pct);


    const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
    const secondaryText = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginVertical: 10,
          padding: 16,
          borderRadius: 14,
          backgroundColor: cardBg,
          borderWidth: 2,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1,  flexDirection: "row", }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600", marginRight: 8 }}>
              {item.name}
            </Text>

            <TouchableOpacity
              onPress={() => onOpenInMaps?.(item)}
              style={{ marginRight: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="location-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            onPress={() => onToggleFavorite?.(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={item.favorite ? "star" : "star-outline"}
              size={22}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        <Text style={{ color: secondaryText, marginTop: 8 }}>
          {item.current}/{item.total}
        </Text>

        <View
          style={{
            height: 14,
            backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#d9d9d9",
            borderRadius: 8,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              backgroundColor: colors.fill,
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: "700", margin: 16 }}>
          Parking Lots
        </Text>
        <TouchableOpacity
        onPress={() => router.push("/map")}
        style={{
          padding: 10,
          borderRadius: 50,
          backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Ionicons name="map-outline" size={26} color={theme.primary} />
      </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Text
        style={{
          color: "#cfd2d6",
          fontSize: 14,
          marginHorizontal: 16,
          marginBottom: 16,
        }}
      >
        Last Updated: {time.toLocaleTimeString()} EST
      </Text>
    </View>
  );
}

function getColors(pct: number) {
  if (pct >= 0.8) return { border: "#f91e1eff", fill: "#f91e1eff" };
  if (pct >= 0.65) return { border: "#ff7f1eff", fill: "#ff7f1eff" };
  if (pct >= 0.25) return { border: "#e0c542", fill: "#cbb538" };
  return { border: "#41c463", fill: "#41c463" };
}
