import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { ThemeContext } from "../../theme/ThemeProvider";
import Constants from "expo-constants";


const { width } = Dimensions.get("window");

type Garage = {
  id: string;
  name: string;
  current: number;
  total: number;
  occupancy_percentage: number;
};

type TimePeriod = "current" | "day" | "week" | "month";

type HistoricalDataPoint = {
  label: string;
  occupancy_percentage: number;
  available_spots: number;
  occupied_spots: number;
};

export default function InsightsScreen() {
  const theme = React.useContext(ThemeContext);

  const [garages, setGarages] = React.useState<Garage[]>([]);
  const [selectedLotId, setSelectedLotId] = React.useState<string>("");
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>("current");
  const [showPeriodDropdown, setShowPeriodDropdown] = React.useState(false);
  const [historicalData, setHistoricalData] = React.useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = React.useState(false);

  const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
  const secondaryText = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";

  const periodOptions: { value: TimePeriod; label: string; icon: string }[] = [
    { value: "current", label: "Current Status", icon: "time-outline" },
    { value: "day", label: "Last 24 Hours", icon: "today-outline" },
    { value: "week", label: "Last 7 Days", icon: "calendar-outline" },
    { value: "month", label: "Last 30 Days", icon: "calendar-number-outline" },
  ];

  const AVAILABILITY_ENDPOINT = "/parking/availability/";

  const getApiBaseUrl = (): string => {
    const configExtra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
    const manifest = Constants.manifest as
      | { extra?: { apiBaseUrl?: string }; debuggerHost?: string }
      | null;
    const manifestExtra = manifest?.extra;

    const override = configExtra?.apiBaseUrl || manifestExtra?.apiBaseUrl;
    if (override) {
      return override.replace(/\/$/, "");
    }

    let host = "localhost";

    if (Platform.OS === "android") {
      host = "10.0.2.2";
    } else {
      const debuggerHost = Constants.expoConfig?.hostUri || manifest?.debuggerHost;
      if (debuggerHost) {
        host = debuggerHost.split(":")[0];
      }
    }

    return `http://${host}:7500`;
  };


  const fetchCurrentData = async () => {
    const curr_avail = "/parking/availability/";

    try {
      setLoading(true);
      const res = await fetch(`${getApiBaseUrl()}${curr_avail}`);

      const data = await res.json();
      setGarages(data.map((g: any, idx: number) => ({
        id: idx.toString(),
        name: g.lot_name || `Lot ${idx + 1}`,
        current: g.occupied_spots,
        total: g.total_spots,
        occupancy_percentage: g.occupancy_percentage,
      })));
      if (!selectedLotId && data.length > 0) setSelectedLotId("0");
    } catch (err) {
      console.error("Error fetching current parking data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (lotId: string, period: TimePeriod) => {
    if (period === "current") {
      setHistoricalData([]);
      return;
    }
    try {
      setLoading(true);
      const lot = garages[parseInt(lotId)];
      if (!lot) return;
      const hist_avail = "/postgres-parking";
      const res = await fetch(`${getApiBaseUrl()}${hist_avail}`);

      const data = await res.json();
      setHistoricalData(data.map((d: any) => ({
        label: new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        occupancy_percentage: d.occupancy_percentage,
        available_spots: d.total_spots - d.occupied_spots,
        occupied_spots: d.occupied_spots,
      })));
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
    if (selectedLotId !== "") {
      fetchHistoricalData(selectedLotId, timePeriod);
    }
  }, [selectedLotId, timePeriod, garages]);

  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 90) return "#f91e1eff"; // Red - Full
    if (percentage >= 70) return "#ff7f1eff"; // Orange - Moderate
    if (percentage >= 25) return "#e0c542"; // Yellow - Available
    return "#41c463"; // Green - Available
  };

  const currentStatus = garages.find((g) => g.id === selectedLotId) || garages[0];

  const calculateAverageStats = () => {
    if (historicalData.length === 0) return null;
    const avgOccupancy =
      historicalData.reduce((sum, d) => sum + d.occupancy_percentage, 0) / historicalData.length;
    const avgAvailable =
      Math.round(historicalData.reduce((sum, d) => sum + d.available_spots, 0) / historicalData.length);
    const avgOccupied =
      Math.round(historicalData.reduce((sum, d) => sum + d.occupied_spots, 0) / historicalData.length);

    return {
      avgOccupancy: avgOccupancy.toFixed(1),
      avgAvailable,
      avgOccupied,
      total: avgAvailable + avgOccupied,
    };
  };

  const getChartData = () => {
    if (historicalData.length === 0) return { labels: ["No Data"], datasets: [{ data: [0] }] };
    return {
      labels: historicalData.map((d) => d.label),
      datasets: [{ data: historicalData.map((d) => d.occupancy_percentage) }],
    };
  };

  const selectedPeriodLabel =
    periodOptions.find((p) => p.value === timePeriod)?.label || "Current Status";

  const avgStats = timePeriod !== "current" ? calculateAverageStats() : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {loading && (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 16 }} />
      )}
      <ScrollView>
        {/* Header */}
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.text, fontSize: 34, fontWeight: "700" }}>
            Parking Insights
          </Text>
          <Text style={{ color: secondaryText, fontSize: 14, marginTop: 4 }}>
            Historical availability data
          </Text>
        </View>

        {/* Lot Selector */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text
            style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginBottom: 12 }}
          >
            Select Parking Lot:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {garages.map((lot) => {
              const isSelected = selectedLotId === lot.id;
              return (
                <TouchableOpacity
                  key={lot.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 8,
                    backgroundColor: isSelected ? theme.primary : cardBg,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? theme.primary
                      : theme.mode === "dark"
                      ? "#2b2b2b"
                      : "#e5e7eb",
                  }}
                  onPress={() => setSelectedLotId(lot.id)}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isSelected ? "#FFFFFF" : theme.text,
                      fontWeight: isSelected ? "600" : "500",
                    }}
                  >
                    {lot.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Period Dropdown */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16, zIndex: 1000 }}>
          <Text
            style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginBottom: 12 }}
          >
            Time Period:
          </Text>
          <View style={{ position: "relative" }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                backgroundColor: cardBg,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb",
              }}
              onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={
                    periodOptions.find((p) => p.value === timePeriod)?.icon as any ||
                    "time-outline"
                  }
                  size={20}
                  color={theme.primary}
                  style={{ marginRight: 10 }}
                />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "500" }}>
                  {selectedPeriodLabel}
                </Text>
              </View>
              <Ionicons
                name={showPeriodDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color={secondaryText}
              />
            </TouchableOpacity>

            {showPeriodDropdown && (
              <View
                style={{
                  position: "absolute",
                  top: 60,
                  left: 0,
                  right: 0,
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb",
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                  zIndex: 1000,
                }}
              >
                {periodOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: index < periodOptions.length - 1 ? 1 : 0,
                      borderBottomColor: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb",
                      backgroundColor:
                        timePeriod === option.value
                          ? theme.mode === "dark"
                            ? "#2b2b2b"
                            : "#f3f4f6"
                          : "transparent",
                    }}
                    onPress={() => {
                      setTimePeriod(option.value);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={timePeriod === option.value ? theme.primary : secondaryText}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={{
                        color: timePeriod === option.value ? theme.primary : theme.text,
                        fontSize: 16,
                        fontWeight: timePeriod === option.value ? "600" : "400",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Current / Average Stats Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            backgroundColor: cardBg,
            borderWidth: 2,
            borderColor: getOccupancyColor(
              avgStats ? parseFloat(avgStats.avgOccupancy) : currentStatus?.occupancy_percentage || 0
            ),
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600" }}>
            {currentStatus?.name || "Loading..."}
          </Text>
          <Text style={{ color: secondaryText, fontSize: 14, marginTop: 4 }}>
            {timePeriod === "current" ? "Current Status" : `Average (${selectedPeriodLabel})`}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#41c463" }}>
                {avgStats ? avgStats.avgAvailable : (currentStatus?.total || 0) - (currentStatus?.current || 0)}
              </Text>
              <Text style={{ fontSize: 12, color: secondaryText, marginTop: 4 }}>
                Available
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#f91e1eff" }}>
                {avgStats ? avgStats.avgOccupied : currentStatus?.current || 0}
              </Text>
              <Text style={{ fontSize: 12, color: secondaryText, marginTop: 4 }}>
                Occupied
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.text }}>
                {avgStats ? avgStats.total : currentStatus?.total || 0}
              </Text>
              <Text style={{ fontSize: 12, color: secondaryText, marginTop: 4 }}>
                Total
              </Text>
            </View>
          </View>

          {/* Occupancy Bar */}
          <View
            style={{
              height: 14,
              backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#d9d9d9",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: (avgStats
                  ? `${avgStats.avgOccupancy}%`
                  : `${currentStatus?.occupancy_percentage || 0}%`) as any,
                height: "100%",
                backgroundColor: getOccupancyColor(
                  avgStats
                    ? parseFloat(avgStats.avgOccupancy)
                    : currentStatus?.occupancy_percentage || 0
                ),
              }}
            />
          </View>
          <Text style={{ fontSize: 14, color: secondaryText, textAlign: "center" }}>
            {avgStats ? avgStats.avgOccupancy : currentStatus?.occupancy_percentage?.toFixed(1) || 0}% Full
          </Text>
        </View>

        {/* Historical Chart */}
        {timePeriod !== "current" && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              padding: 16,
              borderRadius: 14,
              backgroundColor: cardBg,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 6,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
              Occupancy Trend
            </Text>
            <BarChart
              data={getChartData()}
              width={width - 64}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: cardBg,
                backgroundGradientFrom: cardBg,
                backgroundGradientTo: cardBg,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.primary,
                labelColor: (opacity = 1) => theme.text,
                style: { borderRadius: 16 },
                propsForLabels: { fontSize: 10 },
                propsForBackgroundLines: { strokeDasharray: "", stroke: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb" },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
              showValuesOnTopOfBars={false}
              fromZero={true}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
