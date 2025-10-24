// screens/InsightsScreen.tsx
import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { ThemeContext } from "../../theme/ThemeProvider";

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

// Mock data for demonstration
const MOCK_GARAGES: Garage[] = [
  { id: "1", name: "Harrison Garage", current: 192, total: 240, occupancy_percentage: 80 },
  { id: "2", name: "Grant Street Garage", current: 158, total: 240, occupancy_percentage: 66 },
  { id: "3", name: "University Street Garage", current: 70, total: 240, occupancy_percentage: 29 },
  { id: "4", name: "Northwestern Garage", current: 240, total: 240, occupancy_percentage: 100 },
  { id: "5", name: "DSAI Lot", current: 32, total: 38, occupancy_percentage: 84 },
];

const MOCK_HISTORICAL_DATA = {
  day: [
    { label: "6AM", occupancy_percentage: 45, available_spots: 132, occupied_spots: 108 },
    { label: "8AM", occupancy_percentage: 78, available_spots: 53, occupied_spots: 187 },
    { label: "10AM", occupancy_percentage: 88, available_spots: 29, occupied_spots: 211 },
    { label: "12PM", occupancy_percentage: 95, available_spots: 12, occupied_spots: 228 },
    { label: "2PM", occupancy_percentage: 82, available_spots: 43, occupied_spots: 197 },
    { label: "4PM", occupancy_percentage: 70, available_spots: 72, occupied_spots: 168 },
    { label: "6PM", occupancy_percentage: 58, available_spots: 101, occupied_spots: 139 },
  ],
  week: [
    { label: "Mon", occupancy_percentage: 82, available_spots: 43, occupied_spots: 197 },
    { label: "Tue", occupancy_percentage: 85, available_spots: 36, occupied_spots: 204 },
    { label: "Wed", occupancy_percentage: 88, available_spots: 29, occupied_spots: 211 },
    { label: "Thu", occupancy_percentage: 90, available_spots: 24, occupied_spots: 216 },
    { label: "Fri", occupancy_percentage: 75, available_spots: 60, occupied_spots: 180 },
    { label: "Sat", occupancy_percentage: 35, available_spots: 156, occupied_spots: 84 },
    { label: "Sun", occupancy_percentage: 28, available_spots: 173, occupied_spots: 67 },
  ],
  month: [
    { label: "Wk1", occupancy_percentage: 78, available_spots: 53, occupied_spots: 187 },
    { label: "Wk2", occupancy_percentage: 82, available_spots: 43, occupied_spots: 197 },
    { label: "Wk3", occupancy_percentage: 85, available_spots: 36, occupied_spots: 204 },
    { label: "Wk4", occupancy_percentage: 80, available_spots: 48, occupied_spots: 192 },
  ],
};

export default function InsightsScreen() {
  const theme = React.useContext(ThemeContext);
  const [garages] = React.useState<Garage[]>(MOCK_GARAGES);
  const [selectedLotId, setSelectedLotId] = React.useState<string>("1");
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>("current");
  const [showPeriodDropdown, setShowPeriodDropdown] = React.useState(false);
  const [lastUpdated] = React.useState<string>(
    new Date().toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    })
  );

  const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
  const secondaryText = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";

  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 90) return "#f91e1eff"; // Red - Full
    if (percentage >= 70) return "#ff7f1eff"; // Orange - Moderate
    if (percentage >= 25) return "#e0c542"; // Yellow - Available
    return "#41c463"; // Green - Available
  };

  const currentStatus = garages.find((g) => g.id === selectedLotId) || garages[0];

  const getHistoricalData = (): HistoricalDataPoint[] => {
    if (timePeriod === "day") return MOCK_HISTORICAL_DATA.day;
    if (timePeriod === "week") return MOCK_HISTORICAL_DATA.week;
    if (timePeriod === "month") return MOCK_HISTORICAL_DATA.month;
    return [];
  };

  const calculateAverageStats = () => {
    const data = getHistoricalData();
    if (data.length === 0) return null;

    const avgOccupancy =
      data.reduce((sum, d) => sum + d.occupancy_percentage, 0) / data.length;
    const avgAvailable =
      Math.round(data.reduce((sum, d) => sum + d.available_spots, 0) / data.length);
    const avgOccupied =
      Math.round(data.reduce((sum, d) => sum + d.occupied_spots, 0) / data.length);

    return {
      avgOccupancy: avgOccupancy.toFixed(1),
      avgAvailable,
      avgOccupied,
      total: avgAvailable + avgOccupied,
    };
  };

  const getChartData = () => {
    const data = getHistoricalData();
    if (data.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => d.occupancy_percentage),
        },
      ],
    };
  };

  const periodOptions: { value: TimePeriod; label: string; icon: string }[] = [
    { value: "current", label: "Current Status", icon: "time-outline" },
    { value: "day", label: "Last 24 Hours", icon: "today-outline" },
    { value: "week", label: "Last 7 Days", icon: "calendar-outline" },
    { value: "month", label: "Last 30 Days", icon: "calendar-number-outline" },
  ];

  const selectedPeriodLabel =
    periodOptions.find((p) => p.value === timePeriod)?.label || "Current Status";

  const avgStats = timePeriod !== "current" ? calculateAverageStats() : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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

        {/* Current Status or Average Stats Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            backgroundColor: cardBg,
            borderWidth: 2,
            borderColor: getOccupancyColor(
              avgStats ? parseFloat(avgStats.avgOccupancy) : currentStatus.occupancy_percentage
            ),
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600" }}>
            {currentStatus.name}
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
                {avgStats ? avgStats.avgAvailable : currentStatus.total - currentStatus.current}
              </Text>
              <Text style={{ fontSize: 12, color: secondaryText, marginTop: 4 }}>
                Available
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#f91e1eff" }}>
                {avgStats ? avgStats.avgOccupied : currentStatus.current}
              </Text>
              <Text style={{ fontSize: 12, color: secondaryText, marginTop: 4 }}>
                Occupied
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.text }}>
                {avgStats ? avgStats.total : currentStatus.total}
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
                  : `${currentStatus.occupancy_percentage}%`) as any,
                height: "100%",
                backgroundColor: getOccupancyColor(
                  avgStats
                    ? parseFloat(avgStats.avgOccupancy)
                    : currentStatus.occupancy_percentage
                ),
              }}
            />
          </View>
          <Text style={{ fontSize: 14, color: secondaryText, textAlign: "center" }}>
            {avgStats ? avgStats.avgOccupancy : currentStatus.occupancy_percentage.toFixed(1)}% Full
          </Text>
        </View>

        {/* Historical Chart - Only show for non-current periods */}
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
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginBottom: 16 }}
            >
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
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 10,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              showValuesOnTopOfBars={false}
              fromZero={true}
            />

            {/* Legend */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: theme.mode === "dark" ? "#2b2b2b" : "#e5e7eb",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: "#41c463",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryText }}>Low (&lt;25%)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: "#e0c542",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryText }}>Moderate (25-70%)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: "#ff7f1eff",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryText }}>High (70-90%)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: "#f91e1eff",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryText }}>Full (90%+)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: secondaryText }}>
            Last Updated: {lastUpdated}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}