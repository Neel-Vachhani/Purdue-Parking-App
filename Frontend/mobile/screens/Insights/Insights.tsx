import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Modal } from "react-native";
import { BarChart } from "react-native-chart-kit";
import Constants from "expo-constants";
import { ThemeContext } from "../../theme/ThemeProvider";
import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

type Garage = {
  id: string;
  name: string;
  current: number;
  total: number;
  occupancy_percentage: number;
};

type TimePeriod = "day" | "week" | "month";

type HistoricalDataPoint = {
  label: string;
  occupancy_percentage: number;
  available_spots: number;
  occupied_spots: number;
};

const LOT_COLUMNS: Record<string, string> = {
  "Harrison Garage": "pgmd",
  "Grant Street Garage": "pgu",
  "University Street Garage": "pgnw",
  "Northwestern Garage": "pgg",
  "DS/AI Lot": "pgw",
  "Graduate House Garage": "pggh",
  "Hillenbrand Hall Garage": "pgh",
  "Lot R": "lot_r",
  "Lot H": "lot_h",
  "Ford Boiler Lot": "lot_fb",
  "KFPC": "kfpc",
  "Lot A": "lot_a",
  "Crec Lot": "crec",
  "Lot O": "lot_o",
  "Tarkington/Wiley Lot": "tark_wily",
  "Lot AA": "lot_aa",
  "Lot BB": "lot_bb",
  "Windsor/Krach Lot": "wnd_krach",
  "Shriver/Earhart/Meredith Lot": "shrv_erht_mrdh",
  "McCutcheon/Harrison Hill Lot": "mcut_harr_hill",
  "Duhme Lot": "duhm",
  "Pierce Street Lot": "pierce_st",
  "PGM Lot": "pgm",
  "Smith/Biochemistry Lot": "smth_bchm",
  "Discovery Park Lot A": "disc_a",
  "Discovery Park Lot AB": "disc_ab",
  "Discovery Park Lot ABC": "disc_abc",
  "Airport Lot": "airport"
};
const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: "day", label: "24 Hours" },
  { value: "week", label: "7 Days" },
  { value: "month", label: "30 Days" },
];

const INITIAL_GARAGES: Garage[] = [
  { id: "0", name: "Harrison Street Parking Garage", current: 80, total: 240, occupancy_percentage: (80 / 240) * 100 },
  { id: "1", name: "Grant Street Parking Garage", current: 158, total: 240, occupancy_percentage: (158 / 240) * 100 },
  { id: "2", name: "University Street Parking Garage", current: 120, total: 240, occupancy_percentage: (120 / 240) * 100 },
  { id: "3", name: "Northwestern Avenue Parking Garage", current: 190, total: 240, occupancy_percentage: (190 / 240) * 100 },
  { id: "4", name: "McCutcheon Drive Parking Garage", current: 60, total: 240, occupancy_percentage: (60 / 240) * 100 },
  { id: "5", name: "Wood Street Parking Garage", current: 200, total: 240, occupancy_percentage: (200 / 240) * 100 },
  { id: "6", name: "Graduate House Parking Garage", current: 130, total: 240, occupancy_percentage: (130 / 240) * 100 },
  { id: "7", name: "Marsteller Street Parking Garage", current: 180, total: 240, occupancy_percentage: (180 / 240) * 100 },
  { id: "8", name: "Lot R", current: 70, total: 120, occupancy_percentage: (70 / 120) * 100 },
  { id: "9", name: "Lot H", current: 50, total: 80, occupancy_percentage: (50 / 80) * 100 },
  { id: "10", name: "Lot FB", current: 30, total: 100, occupancy_percentage: (30 / 100) * 100 },
  { id: "11", name: "Krach Leadership Center Parking", current: 75, total: 100, occupancy_percentage: (75 / 100) * 100 },
  { id: "12", name: "Lot A", current: 90, total: 120, occupancy_percentage: (90 / 120) * 100 },
  { id: "13", name: "CoRec Parking", current: 110, total: 150, occupancy_percentage: (110 / 150) * 100 },
  { id: "14", name: "Lot O", current: 40, total: 100, occupancy_percentage: (40 / 100) * 100 },
  { id: "15", name: "Tarkington/Wiley Lot", current: 45, total: 100, occupancy_percentage: (45 / 100) * 100 },
  { id: "16", name: "Lot AA", current: 60, total: 100, occupancy_percentage: (60 / 100) * 100 },
  { id: "17", name: "Lot BB", current: 30, total: 80, occupancy_percentage: (30 / 80) * 100 },
  { id: "18", name: "Windsor/Krach Lot", current: 65, total: 100, occupancy_percentage: (65 / 100) * 100 },
  { id: "19", name: "Shriver/Earhart/Meredith Lot", current: 80, total: 120, occupancy_percentage: (80 / 120) * 100 },
  { id: "20", name: "McCutcheon/Harrison Hill Lot", current: 55, total: 100, occupancy_percentage: (55 / 100) * 100 },
  { id: "21", name: "Duhme Lot", current: 20, total: 60, occupancy_percentage: (20 / 60) * 100 },
  { id: "22", name: "Pierce Street Lot", current: 35, total: 100, occupancy_percentage: (35 / 100) * 100 },
  { id: "23", name: "Smith/Biochemistry Lot", current: 75, total: 120, occupancy_percentage: (75 / 120) * 100 },
  { id: "24", name: "Discovery Park Lot A", current: 40, total: 100, occupancy_percentage: (40 / 100) * 100 },
  { id: "25", name: "Discovery Park Lot AB", current: 45, total: 100, occupancy_percentage: (45 / 100) * 100 },
  { id: "26", name: "Discovery Park Lot ABC", current: 50, total: 100, occupancy_percentage: (50 / 100) * 100 },
  { id: "27", name: "Airport Lot", current: 25, total: 80, occupancy_percentage: (25 / 80) * 100 },
];

export default function InsightsScreen() {
  const theme = React.useContext(ThemeContext);
  const [garages, setGarages] = React.useState<Garage[]>(INITIAL_GARAGES);
  const [selectedLotId, setSelectedLotId] = React.useState<string>("0");
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>("day");
  const [historicalData, setHistoricalData] = React.useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showLotDropdown, setShowLotDropdown] = React.useState(false);

  const isDark = theme.mode === "dark";
  const cardBg = isDark ? "#1a1d21" : "#FFFFFF";
  const secondaryBg = isDark ? "#252930" : "#f9fafb";
  const borderColor = isDark ? "#2d3139" : "#e5e7eb";
  const secondaryText = isDark ? "#9ca3af" : "#6b7280";
  const accentColor = "#6366f1";

  const getApiBaseUrl = (): string => {
    return "http://localhost:7500";
  };

  const fetchCurrentData = async () => {
    setLoading(true);
    try {
      const mappedGarages: Garage[] = await Promise.all(
        Object.keys(LOT_COLUMNS).map(async (lotName, idx) => {
          const lotColumn = LOT_COLUMNS[lotName];
          
          try {
            const res = await fetch(`${getApiBaseUrl()}/postgres-parking?lot=${lotColumn}&period=day`);
            const data = await res.json();
            
            // Get the initial garage data to use correct totals
            const initialGarage = INITIAL_GARAGES.find(g => g.name === lotName);
            const total = initialGarage?.total ?? 100;
            
            // Get the most recent availability data
            const latestData = Array.isArray(data) && data.length > 0 ? data[data.length - 1] : null;
            const availableSpots = latestData?.availability ?? 0;
            
            // Calculate occupied spots: total - available = occupied
            const occupied = total - availableSpots;
            
            
            return {
              id: idx.toString(),
              name: lotName,
              current: occupied,
              total: total,
              occupancy_percentage: (occupied / total) * 100,
            };
          } catch (err) {
            console.error(`Error fetching data for ${lotName}:`, err);
            // Return initial data if fetch fails
            const initialGarage = INITIAL_GARAGES[idx];
            return initialGarage;
          }
        })
      );
      setGarages(mappedGarages);
      console.log(garages)
      if (!selectedLotId && mappedGarages.length > 0) setSelectedLotId("0");
    } catch (err) {
      console.error("Error fetching current parking data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (lotId: string, period: TimePeriod) => {
    if (!garages.length) return;
    setLoading(true);
    try {
      const selectedGarage = garages[parseInt(lotId)];
      const lotColumn = LOT_COLUMNS[selectedGarage.name];
      const res = await fetch(`${getApiBaseUrl()}/postgres-parking?lot=${lotColumn}&period=${period}`);
      const data = await res.json();
      console.log(data)
      if (!Array.isArray(data)) {
        console.error("Historical data not an array:", data);
        setHistoricalData([]);
        return;
      }

      // Get the total capacity for this lot
      const total = selectedGarage.total;

      setHistoricalData(
        data.map((d: any) => {
          const availableSpots = d.availability; // This is actual number of available spots
          const occupiedSpots = total - availableSpots;
          
          return {
            label: new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            occupancy_percentage: (occupiedSpots / total) * 100,
            available_spots: availableSpots,
            occupied_spots: occupiedSpots,
          };
        })
      );
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCurrentData();
  }, []);

  React.useEffect(() => {
    if (selectedLotId !== "") fetchHistoricalData(selectedLotId, timePeriod);
  }, [selectedLotId, timePeriod, garages]);

  const currentStatus = garages[parseInt(selectedLotId)] || garages[0];

  const getChartData = () => {
  return {
    labels: historicalData.map((d) => d.label),
    datasets: [
      {
        data: historicalData.map((d) => Math.round(d.occupancy_percentage)),
        colors: historicalData.map((d) => {
          const value = d.occupancy_percentage;

          if (value < 50) return (opacity = 1) => `rgba(76, 175, 80, ${opacity})`;      // 🟢 green
          if (value < 80) return (opacity = 1) => `rgba(255, 193, 7, ${opacity})`;     // 🟡 yellow
          return (opacity = 1) => `rgba(244, 67, 54, ${opacity})`;                     // 🔴 red
        }),
      },
    ],
  };
};


  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return "#ef4444";
    if (percentage >= 70) return "#f59e0b";
    if (percentage >= 25) return "#eab308";
    return "#10b981";
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return "Nearly Full";
    if (percentage >= 70) return "Busy";
    if (percentage >= 25) return "Moderate";
    return "Available";
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 }}>
          <Text style={{ color: theme.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.5 }}>
            Parking Insights
          </Text>
          <Text style={{ color: secondaryText, fontSize: 15, marginTop: 6 }}>
            Real-time availability and trends
          </Text>
        </View>

        {/* Lot Selector */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Parking Location
          </Text>
          <TouchableOpacity
            onPress={() => setShowLotDropdown(!showLotDropdown)}
            style={{ 
              borderRadius: 16, 
              backgroundColor: cardBg,
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: "500" }}>
              {garages[parseInt(selectedLotId)]?.name || "Select a lot"}
            </Text>
            <Text style={{ color: secondaryText, fontSize: 18 }}>
              {showLotDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {showLotDropdown && (
            <View style={{
              marginTop: 8,
              borderRadius: 16,
              backgroundColor: cardBg,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 3,
              overflow: "hidden",
            }}>
              {garages.map((lot, index) => (
                <TouchableOpacity
                  key={lot.id}
                  onPress={() => {
                    setSelectedLotId(lot.id);
                    setShowLotDropdown(false);
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: selectedLotId === lot.id ? accentColor + "15" : "transparent",
                    borderBottomWidth: index < garages.length - 1 ? 1 : 0,
                    borderBottomColor: borderColor,
                  }}
                >
                  <Text style={{ 
                    color: selectedLotId === lot.id ? accentColor : theme.text, 
                    fontSize: 16,
                    fontWeight: selectedLotId === lot.id ? "600" : "400",
                  }}>
                    {lot.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Time Period Pills */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Time Range
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {periodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setTimePeriod(option.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: timePeriod === option.value ? accentColor : secondaryBg,
                  alignItems: "center",
                  shadowColor: timePeriod === option.value ? accentColor : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: timePeriod === option.value ? 4 : 0,
                }}
              >
                <Text style={{ 
                  color: timePeriod === option.value ? "#ffffff" : theme.text, 
                  fontSize: 14, 
                  fontWeight: "600" 
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Card */}
        {currentStatus && (
          <View style={{ 
            marginHorizontal: 20, 
            marginBottom: 24, 
            padding: 24, 
            borderRadius: 20, 
            backgroundColor: cardBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>
                  {currentStatus.name}
                </Text>
                <Text style={{ color: secondaryText, fontSize: 13, marginTop: 4 }}>
                  Current Status
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: getOccupancyColor(currentStatus.occupancy_percentage) + "20",
              }}>
                <Text style={{ 
                  color: getOccupancyColor(currentStatus.occupancy_percentage), 
                  fontSize: 13, 
                  fontWeight: "700" 
                }}>
                  {getStatusText(currentStatus.occupancy_percentage)}
                </Text>
              </View>
            </View>

            <View style={{ 
              flexDirection: "row", 
              justifyContent: "space-between", 
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopColor: borderColor,
            }}>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#10b981" }}>
                  {currentStatus.total - currentStatus.current}
                </Text>
                <Text style={{ fontSize: 12, color: secondaryText, marginTop: 6, fontWeight: "500" }}>
                  Available
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: borderColor }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#ef4444" }}>
                  {currentStatus.current}
                </Text>
                <Text style={{ fontSize: 12, color: secondaryText, marginTop: 6, fontWeight: "500" }}>
                  Occupied
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: borderColor }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: theme.text }}>
                  {currentStatus.total}
                </Text>
                <Text style={{ fontSize: 12, color: secondaryText, marginTop: 6, fontWeight: "500" }}>
                  Total Spots
                </Text>
              </View>
            </View>

            {/* Occupancy Bar */}
            <View style={{ marginTop: 20 }}>
              <View style={{ 
                height: 8, 
                backgroundColor: secondaryBg, 
                borderRadius: 4, 
                overflow: "hidden" 
              }}>
                <View style={{ 
                  height: "100%", 
                  width: `${currentStatus.occupancy_percentage}%`, 
                  backgroundColor: getOccupancyColor(currentStatus.occupancy_percentage),
                  borderRadius: 4,
                }} />
              </View>
              <Text style={{ 
                color: secondaryText, 
                fontSize: 12, 
                marginTop: 8, 
                textAlign: "center",
                fontWeight: "500" 
              }}>
                {currentStatus.occupancy_percentage.toFixed(0)}% Occupied
              </Text>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={{ alignItems: "center", marginVertical: 20 }}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        )}

        {/* Historical Chart */}
        {!loading && historicalData.length > 0 && (
          <View style={{ 
            marginHorizontal: 20, 
            marginBottom: 32, 
            padding: 20, 
            borderRadius: 20, 
            backgroundColor: cardBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Occupancy Trend
            </Text>
            <BarChart
              data={getChartData()}
              width={width - 80}
              height={240}
              yAxisSuffix="%"
              yAxisInterval={1}
              segments={4}
              chartConfig={{
                backgroundColor: cardBg,
                backgroundGradientFrom: cardBg,
                backgroundGradientTo: cardBg,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: () => secondaryText,
                propsForBackgroundLines: { 
                  strokeDasharray: "", 
                  stroke: borderColor,
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 11,
                },
              }}
              fromZero
              style={{ borderRadius: 16, marginVertical: 8 }}
              showValuesOnTopOfBars
              withCustomBarColorFromData
              flatColor
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}