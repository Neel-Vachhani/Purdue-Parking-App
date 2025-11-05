import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { ThemeContext } from "../../theme/ThemeProvider";

const { width } = Dimensions.get("window");

type Lot = {
  id: number;
  code: string;
  name: string;
};

const PARKING_LOTS: Lot[] = [
  { id: 1, code: "PGH", name: "Harrison Street Parking Garage" },
  { id: 2, code: "PGG", name: "Grant Street Parking Garage" },
  { id: 3, code: "PGU", name: "University Street Parking Garage" },
  { id: 4, code: "PGNW", name: "Northwestern Avenue Parking Garage" },
  { id: 5, code: "PGMD", name: "McCutcheon Drive Parking Garage" },
  { id: 6, code: "PGW", name: "Wood Street Parking Garage" },
  { id: 7, code: "PGGH", name: "Graduate House Parking Garage" },
  { id: 8, code: "PGM", name: "Marsteller Street Parking Garage" },
  { id: 9, code: "LOT_R", name: "Lot R" },
  { id: 10, code: "LOT_H", name: "Lot H" },
  { id: 11, code: "LOT_FB", name: "Lot FB" },
  { id: 12, code: "KFPC", name: "Kozuch Football Performance Complex Lot" },
  { id: 13, code: "LOT_A", name: "Lot A" },
  { id: 14, code: "CREC", name: "Co-Rec Parking Lots" },
  { id: 15, code: "LOT_O", name: "Lot O" },
  { id: 16, code: "TARK_WILY", name: "Tarkington Wiley Parking Lots" },
  { id: 17, code: "LOT_AA", name: "Lot AA" },
  { id: 18, code: "LOT_BB", name: "Lot BB" },
  { id: 19, code: "WND_KRACH", name: "Windsor & Krach Shared Parking Lot" },
  { id: 20, code: "SHRV_ERHT_MRDH", name: "Shreve, Earhart & Meredith Shared Lot" },
  { id: 21, code: "MCUT_HARR_HILL", name: "McCutcheon, Harrison & Hillenbrand Shared Lot" },
  { id: 22, code: "DUHM", name: "Duhme Hall Parking Lot" },
  { id: 23, code: "PIERCE_ST", name: "Pierce Street Parking Lot" },
  { id: 24, code: "SMTH_BCHM", name: "Smith & Biochemistry Lot" },
  { id: 25, code: "DISC_A", name: "Discovery Lot (A Permit)" },
  { id: 26, code: "DISC_AB", name: "Discovery Lot (AB Permit)" },
  { id: 27, code: "DISC_ABC", name: "Discovery Lot (ABC Permit)" },
  { id: 28, code: "AIRPORT", name: "Airport Parking Lots" },
];

const hours = Array.from({ length: 24 }, (_, i) => i);

const weekdays = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PredictiveInsights() {
  const theme = React.useContext(ThemeContext);
  const [selectedLot, setSelectedLot] = React.useState<Lot>(PARKING_LOTS[0]);
  const [selectedHour, setSelectedHour] = React.useState<number>(0);
  const [selectedWeekday, setSelectedWeekday] = React.useState<string>("All Days");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ average_occupancy: number; likely_full?: boolean } | null>(null);

  const cardBg = "#FFFFFF"; // hardcoded card background
  const secondaryBg = "#f3f4f6"; // hardcoded secondary background
  const accentColor = "#6366f1";

  const fetchPredictiveData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("lot", selectedLot.code.toLowerCase());
      params.append("hour", selectedHour.toString());
      if (selectedWeekday !== "All Days") params.append("weekday", selectedWeekday.toLowerCase());
      params.append("threshold", "80");

      const res = await fetch(`http://localhost:7500/api/hourly_average_parking?${params.toString()}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Error fetching predictive data:", err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPredictiveData();
  }, [selectedLot, selectedHour, selectedWeekday]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg, padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: theme.text, marginBottom: 16 }}>
        Predictive Parking Insights
      </Text>

      {/* Lot Selector */}
      <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.text }}>Parking Lot</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {PARKING_LOTS.map((lot) => (
          <TouchableOpacity
            key={lot.id}
            onPress={() => setSelectedLot(lot)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: selectedLot.code === lot.code ? accentColor : secondaryBg,
              marginRight: 8,
            }}
          >
            <Text style={{ color: selectedLot.code === lot.code ? "#fff" : "#000", fontWeight: "500" }}>
              {lot.code}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Hour Selector */}
      <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.text }}>Hour of Day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {hours.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => setSelectedHour(h)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: selectedHour === h ? accentColor : secondaryBg,
              marginRight: 8,
            }}
          >
            <Text style={{ color: selectedHour === h ? "#fff" : "#000", fontWeight: "500" }}>{h}:00</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Weekday Selector */}
      <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.text }}>Weekday</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {weekdays.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setSelectedWeekday(d)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: selectedWeekday === d ? accentColor : secondaryBg,
              marginRight: 8,
            }}
          >
            <Text style={{ color: selectedWeekday === d ? "#fff" : "#000", fontWeight: "500" }}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result Card */}
      <View
        style={{
          padding: 20,
          borderRadius: 20,
          backgroundColor: cardBg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={accentColor} />
        ) : result ? (
          <>
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text, marginBottom: 8 }}>
              {selectedLot.name} @ {selectedHour}:00
              {selectedWeekday !== "All Days" ? ` (${selectedWeekday})` : ""}
            </Text>
            <Text style={{ fontSize: 18, color: theme.text, marginBottom: 4 }}>
              Average Occupancy: {result.average_occupancy}%
            </Text>
            {result.likely_full !== undefined && (
              <Text style={{ fontSize: 16, color: result.likely_full ? "#ef4444" : "#10b981" }}>
                {result.likely_full ? "Likely Full" : "Available"}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ color: theme.text }}>No data available.</Text>
        )}
      </View>
    </ScrollView>
  );
}
