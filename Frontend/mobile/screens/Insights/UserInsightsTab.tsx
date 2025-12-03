import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { ThemeContext } from "../../theme/ThemeProvider";

const { width } = Dimensions.get("window");

type LotVisit = {
  lot__code: string;
  lot__name: string;
  visits: number;
};

type DayVisit = {
  day_of_week: string;
  visits: number;
};

type Insights = {
  total_parks: number;
  most_visited_lots: LotVisit[];
  visits_per_day: DayVisit[];
};

const TIME_PERIODS = ["day", "week", "month"] as const;

export default function UserInsightsTab() {
  const theme = React.useContext(ThemeContext);
  const [loading, setLoading] = React.useState(false);
  const [insights, setInsights] = React.useState<Insights | null>(null);
  const [timePeriod, setTimePeriod] = React.useState<typeof TIME_PERIODS[number]>("day");

  const accentColor = "#6366f1";
  const isDark = theme.mode === "dark";
  const cardBg = isDark ? "#1a1d21" : "#FFFFFF";
  const secondaryBg = isDark ? "#252930" : "#f9fafb";
  const borderColor = isDark ? "#2d3139" : "#e5e7eb";
  const secondaryText = isDark ? "#9ca3af" : "#6b7280";

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://YOUR_API_DOMAIN/user/insights/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }), // replace with actual user email
      });
      const data = await response.json();
      if (data.success) setInsights(data.insights);
      else console.error("Error fetching insights:", data.error);
    } catch (err) {
      console.error("Network error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInsights();
  }, []);

  const renderBarChart = (labels: string[], data: number[], title: string) => (
    <View style={{ marginVertical: 16 }}>
      <Text style={{ color: theme.text, fontWeight: "700", marginBottom: 12 }}>{title}</Text>
      <BarChart
        data={{ labels, datasets: [{ data }] }}
        width={width - 40}
        height={220}
        fromZero
        showValuesOnTopOfBars
        chartConfig={{
          backgroundGradientFrom: cardBg,
          backgroundGradientTo: cardBg,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: () => secondaryText,
        }}
        style={{ borderRadius: 16 }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "700", marginBottom: 20 }}>
          Parking Insights
        </Text>

        {/* Time Period Pills */}
        <View style={{ flexDirection: "row", marginBottom: 24, gap: 10 }}>
          {TIME_PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setTimePeriod(period)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: timePeriod === period ? accentColor : secondaryBg,
                alignItems: "center",
                shadowColor: timePeriod === period ? accentColor : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <Text style={{
                color: timePeriod === period ? "#fff" : theme.text,
                fontWeight: "600",
              }}>
                {period.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading */}
        {loading && <ActivityIndicator size="large" color={accentColor} style={{ marginVertical: 20 }} />}

        {/* Total Parks */}
        {insights && (
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 12,
          }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
              Total Parking Sessions
            </Text>
            <Text style={{ color: accentColor, fontSize: 32, fontWeight: "800" }}>
              {insights.total_parks}
            </Text>
          </View>
        )}

        {/* Most Visited Lots */}
        {insights && insights.most_visited_lots.length > 0 &&
          renderBarChart(
            insights.most_visited_lots.map(lot => lot.lot__code),
            insights.most_visited_lots.map(lot => lot.visits),
            "Most Visited Lots"
          )
        }

        {/* Visits Per Day */}
        {insights && insights.visits_per_day.length > 0 &&
          renderBarChart(
            insights.visits_per_day.map(day => day.day_of_week),
            insights.visits_per_day.map(day => day.visits),
            "Visits Per Day"
          )
        }

      </ScrollView>
    </View>
  );
}
