import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { ThemeContext } from "../../theme/ThemeProvider";
import { Platform } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "../../config/env";
const API_BASE = getApiBaseUrl();

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
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;

      if (!email) {
        console.error("No user email found in SecureStore");
        setInsights(null);
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API_BASE}/user/insights/`, { email });
      const data = res.data;

      if (data.success) {
        setInsights(data.insights);
      } else {
        console.error("Error fetching insights:", data.error);
        setInsights(null);
      }
    } catch (err) {
      console.error("Network error fetching insights:", err);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInsights();
  }, []);

  const renderBarChart = (labels: string[], data: number[], title: string) => (
    <View style={[styles.chartCard, { backgroundColor: cardBg, shadowOpacity: isDark ? 0.4 : 0.1 }]}>
      <Text style={[styles.chartTitle, { color: theme.text }]}>{title}</Text>
      <BarChart
        data={{ labels, datasets: [{ data }] }}
        width={width - 80}
        height={240}
        yAxisLabel=""
        yAxisSuffix="%"
        fromZero
        showValuesOnTopOfBars
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
        style={styles.chart}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Your Parking Insights
          </Text>
          <Text style={[styles.headerSubtitle, { color: secondaryText }]}>
            Track your parking patterns and habits
          </Text>
        </View>

        {/* Time Period Pills */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIME PERIOD</Text>
          <View style={styles.periodButtons}>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setTimePeriod(period)}
                style={[
                  styles.periodButton,
                  { backgroundColor: timePeriod === period ? accentColor : secondaryBg },
                  timePeriod === period && styles.periodButtonActive
                ]}
              >
                <Text style={[
                  styles.periodButtonText,
                  { color: timePeriod === period ? "#ffffff" : theme.text },
                  timePeriod === period && styles.periodButtonTextActive
                ]}>
                  {period === "day" ? "24 Hours" : period === "week" ? "7 Days" : "30 Days"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingText, { color: secondaryText }]}>
              Loading your insights...
            </Text>
          </View>
        )}

        {/* Total Parks Card */}
        {insights && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <View style={[
              styles.totalParksCard,
              { backgroundColor: cardBg, borderColor, shadowOpacity: isDark ? 0.4 : 0.1 }
            ]}>
              <Text style={[styles.totalParksLabel, { color: secondaryText }]}>
                Total Parking Sessions
              </Text>
              <Text style={[styles.totalParksValue, { color: accentColor }]}>
                {insights.total_parks}
              </Text>
              <Text style={[styles.totalParksSubtext, { color: secondaryText }]}>
                All time
              </Text>
            </View>
          </View>
        )}

        {/* Most Visited Lots */}
        {insights && insights.most_visited_lots.length > 0 && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MOST VISITED LOCATIONS</Text>
            {renderBarChart(
              insights.most_visited_lots
                .slice(0, 5) // take top 5
                .map(lot => lot.lot__code.toUpperCase()),
              insights.most_visited_lots
                .slice(0, 5) // take top 5
                .map(lot => lot.visits),
              "Top Parking Locations"
            )}

          </View>
        )}

        {/* Visits Per Day */}
        {insights && insights.visits_per_day.length > 0 && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WEEKLY PATTERN</Text>
             {(() => {
              const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
              const visitsMap: Record<string, number> = {};
              weekDays.forEach(day => visitsMap[day] = 0);

              insights.visits_per_day.forEach(d => {
                if (weekDays.includes(d.day_of_week)) {
                  visitsMap[d.day_of_week] += d.visits;
                }
              });

              return renderBarChart(
                weekDays.map(d => d.slice(0, 3)),  // Mon, Tue, Wed, ...
                weekDays.map(d => visitsMap[d]),
                "Parking by Day of Week"
              );
            })()}


          </View>
        )}

        {/* Empty State */}
        {!loading && (!insights || insights.total_parks === 0) && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: secondaryText }]}>
              No parking data available yet.
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: secondaryText }]}>
              Start parking to see your insights!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 1,
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: "row",
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  periodButtonActive: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  totalParksCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    alignItems: "center",
  },
  totalParksLabel: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  totalParksValue: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 8,
  },
  totalParksSubtext: {
    fontSize: 13,
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 15,
  },
});