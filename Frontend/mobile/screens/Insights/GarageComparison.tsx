import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";

// Garage type definition
type Garage = {
  id: string;
  name: string;
  code: string;
  current: number;
  total: number;
  occupancy_percentage: number;
};

// Sample garage data (matches your PARKING_LOTS structure)
const GARAGES: Garage[] = [
  { id: "1", name: "Harrison Street Parking Garage", code: "pgh", current: 180, total: 240, occupancy_percentage: 75 },
  { id: "2", name: "Grant Street Parking Garage", code: "pgg", current: 158, total: 240, occupancy_percentage: 65.8 },
  { id: "3", name: "University Street Parking Garage", code: "pgu", current: 120, total: 240, occupancy_percentage: 50 },
  { id: "4", name: "Northwestern Avenue Parking Garage", code: "pgnw", current: 190, total: 240, occupancy_percentage: 79.2 },
  { id: "5", name: "McCutcheon Drive Parking Garage", code: "pgmd", current: 60, total: 240, occupancy_percentage: 25 },
  { id: "6", name: "Wood Street Parking Garage", code: "pgw", current: 200, total: 240, occupancy_percentage: 83.3 },
  { id: "7", name: "Graduate House Parking Garage", code: "pggh", current: 130, total: 240, occupancy_percentage: 54.2 },
  { id: "8", name: "Marsteller Street Parking Garage", code: "pgm", current: 180, total: 240, occupancy_percentage: 75 },
  // Missing lots/garages from PARKING_LOTS
  { id: "9", name: "Lot R", code: "lot_r", current: 0, total: 120, occupancy_percentage: 0 },
  { id: "10", name: "Lot H", code: "lot_h", current: 0, total: 80, occupancy_percentage: 0 },
  { id: "11", name: "Lot FB", code: "lot_fb", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "12", name: "Kozuch Football Performance Complex Lot", code: "kfpc", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "13", name: "Lot A", code: "lot_a", current: 0, total: 120, occupancy_percentage: 0 },
  { id: "14", name: "Co-Rec Parking Lots", code: "crec", current: 0, total: 150, occupancy_percentage: 0 },
  { id: "15", name: "Lot O", code: "lot_o", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "16", name: "Tarkington Wiley Parking Lots", code: "tark_wily", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "17", name: "Lot AA", code: "lot_aa", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "18", name: "Lot BB", code: "lot_bb", current: 0, total: 80, occupancy_percentage: 0 },
  { id: "19", name: "Windsor & Krach Shared Parking Lot", code: "wnd_krach", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "20", name: "Shreve, Earhart & Meredith Shared Lot", code: "shrv_erht_mrdh", current: 0, total: 120, occupancy_percentage: 0 },
  { id: "21", name: "McCutcheon, Harrison & Hillenbrand Shared Lot", code: "mcut_harr_hill", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "22", name: "Duhme Hall Parking Lot", code: "duhm", current: 0, total: 60, occupancy_percentage: 0 },
  { id: "23", name: "Pierce Street Parking Lot", code: "pierce_st", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "24", name: "Smith & Biochemistry Lot", code: "smth_bchm", current: 0, total: 120, occupancy_percentage: 0 },
  { id: "25", name: "Discovery Lot (A Permit)", code: "disc_a", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "26", name: "Discovery Lot (AB Permit)", code: "disc_ab", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "27", name: "Discovery Lot (ABC Permit)", code: "disc_abc", current: 0, total: 100, occupancy_percentage: 0 },
  { id: "28", name: "Airport Parking Lots", code: "airport", current: 0, total: 80, occupancy_percentage: 0 },
];
type ComparisonData = {
  garage: Garage;
  hourlyAvg: number[];
  peakHour: number;
  avgOccupancy: number;
};

export default function GarageComparison() {
  const [selectedGarages, setSelectedGarages] = useState<string[]>(["1", "2"]);
  const [showPicker, setShowPicker] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<"day" | "week">("day");

  // Fetch comparison data for selected garages
// Replace your existing fetchComparisonData with this function:
const fetchComparisonData = async () => {
  setLoading(true);
  try {
    // Build an array of ComparisonData by fetching backend for each selected garage
    const data: ComparisonData[] = await Promise.all(
      selectedGarages.map(async (garageId) => {
        const garage = GARAGES.find((g) => g.id === garageId)!;
        if (!garage) throw new Error(`Garage id ${garageId} not found in GARAGES`);

        const BACKEND_BASE = "http://127.0.0.1:7500"; // change to your backend host if different
        const url = `${BACKEND_BASE}/parking/comparison?lots=${encodeURIComponent(garage.code)}&period=${timePeriod}`;

        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`Fetch failed for ${garage.code}: ${resp.status}`);
          // Return a fallback object so UI doesn't break
          return {
            garage,
            hourlyAvg: Array.from({ length: 24 }, () => 0),
            peakHour: 0,
            avgOccupancy: 0,
          } as ComparisonData;
        }

        const json = await resp.json();

        // Backend returns { comparisons: [ { ... } ], period:, timestamp: }
        if (!json.comparisons || json.comparisons.length === 0) {
          console.warn(`No comparison data returned for ${garage.code}`);
          return {
            garage,
            hourlyAvg: Array.from({ length: 24 }, () => 0),
            peakHour: 0,
            avgOccupancy: 0,
          } as ComparisonData;
        }

        const c = json.comparisons[0];
        console.log(c)
        // Map backend fields to your frontend types
        // Backend fields used in your snippet: current_occupancy, total_capacity, hourly_averages, peak_hour, average_occupancy
        const hourlyAvg: number[] = Array.isArray(c.hourly_averages)
          ? c.hourly_averages.map((n: any) => Number(n))
          : Array.from({ length: 24 }, () => 0);

        const peakHour = typeof c.peak_hour === "number" ? c.peak_hour : 0;
        const avgOccupancy = typeof c.average_occupancy === "number" ? c.average_occupancy : 0;

        // Update the garage object with current values returned by backend (optional but helpful)
        const mappedGarage: Garage = {
          ...garage,
          current: typeof c.current_occupancy === "number" ? c.current_occupancy : garage.current,
          total: typeof c.total_capacity === "number" ? c.total_capacity : garage.total,
          occupancy_percentage:
            typeof c.total_capacity === "number" && typeof c.current_occupancy === "number"
              ? Number(((c.current_occupancy / c.total_capacity) * 100).toFixed(1))
              : garage.occupancy_percentage,
        };

        return {
          garage: mappedGarage,
          hourlyAvg,
          peakHour,
          avgOccupancy,
        } as ComparisonData;
      })
    );

    setComparisonData(data);
  } catch (error) {
    console.error("Error fetching comparison data:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (selectedGarages.length > 0) {
      fetchComparisonData();
    }
  }, [selectedGarages, timePeriod]);

  const toggleGarageSelection = (garageId: string) => {
    setSelectedGarages(prev => {
      if (prev.includes(garageId)) {
        return prev.filter(id => id !== garageId);
      } else if (prev.length < 4) {
        return [...prev, garageId];
      }
      return prev;
    });
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 85) return "#ef4444";
    if (percentage >= 70) return "#f97316";
    if (percentage >= 50) return "#eab308";
    if (percentage >= 30) return "#84cc16";
    return "#22c55e";
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return "Nearly Full";
    if (percentage >= 70) return "Busy";
    if (percentage >= 50) return "Moderate";
    return "Available";
  };

  const formatGarageName = (name: string) => {
    return name.replace(" Parking Garage", "");
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compare Garages</Text>
          <Text style={styles.headerSubtitle}>
            Select up to 4 garages to compare
          </Text>
        </View>

        {/* Garage Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>SELECTED GARAGES ({selectedGarages.length}/4)</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectedChips}>
            {selectedGarages.map(id => {
              const garage = GARAGES.find(g => g.id === id);
              return (
                <View key={id} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {garage ? formatGarageName(garage.name) : ""}
                  </Text>
                  <TouchableOpacity onPress={() => toggleGarageSelection(id)}>
                    <Text style={styles.chipClose}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIME PERIOD</Text>
          <View style={styles.periodButtons}>
            <TouchableOpacity
              style={[styles.periodButton, timePeriod === "day" && styles.periodButtonActive]}
              onPress={() => setTimePeriod("day")}
            >
              <Text style={[styles.periodButtonText, timePeriod === "day" && styles.periodButtonTextActive]}>
                24 Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, timePeriod === "week" && styles.periodButtonActive]}
              onPress={() => setTimePeriod("week")}
            >
              <Text style={[styles.periodButtonText, timePeriod === "week" && styles.periodButtonTextActive]}>
                7 Days
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading comparison data...</Text>
          </View>
        )}

        {/* Comparison Cards */}
        {!loading && comparisonData.length > 0 && (
          <>
            {/* Quick Stats Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CURRENT AVAILABILITY</Text>
              <View style={styles.statsGrid}>
                {comparisonData.map(({ garage }) => (
                  <View key={garage.id} style={styles.statCard}>
                    <Text style={styles.statGarageName} numberOfLines={2}>
                      {formatGarageName(garage.name)}
                    </Text>
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#22c55e" }]}>
                          {garage.total - garage.current}
                        </Text>
                        <Text style={styles.statLabel}>Available</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#ef4444" }]}>
                          {garage.current}
                        </Text>
                        <Text style={styles.statLabel}>Occupied</Text>
                      </View>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${garage.occupancy_percentage}%`,
                            backgroundColor: getOccupancyColor(garage.occupancy_percentage),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.occupancyText}>
                      {garage.occupancy_percentage.toFixed(1)}% Full
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Detailed Comparison Table */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DETAILED METRICS</Text>
              <View style={styles.comparisonTable}>
                {/* Header Row */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellLabel}>Metric</Text>
                  </View>
                  {comparisonData.map(({ garage }) => (
                    <View key={garage.id} style={styles.tableCell}>
                      <Text style={styles.tableCellHeader} numberOfLines={2}>
                        {garage.code.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Status Row */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellLabel}>Status</Text>
                  </View>
                  {comparisonData.map(({ garage }) => (
                    <View key={garage.id} style={styles.tableCell}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getOccupancyColor(garage.occupancy_percentage) },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {getStatusText(garage.occupancy_percentage)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Peak Hour Row */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellLabel}>Peak Hour</Text>
                  </View>
                  {comparisonData.map(({ peakHour, garage }) => (
                    <View key={garage.id} style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>
                        {peakHour === 0 ? "12" : peakHour > 12 ? peakHour - 12 : peakHour}:00 {peakHour >= 12 ? "PM" : "AM"}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Avg Occupancy Row */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellLabel}>Avg Occupancy</Text>
                  </View>
                  {comparisonData.map(({ avgOccupancy, garage }) => (
                    <View key={garage.id} style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>
                        {avgOccupancy.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total Capacity Row */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellLabel}>Capacity</Text>
                  </View>
                  {comparisonData.map(({ garage }) => (
                    <View key={garage.id} style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>{garage.total}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Best Options Card */}
            <View style={styles.section}>
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>🎯 Best Options Right Now</Text>
                <Text style={styles.recommendationSubtitle}>
                  Based on current availability
                </Text>
                {comparisonData
                  .sort((a, b) => a.garage.occupancy_percentage - b.garage.occupancy_percentage)
                  .slice(0, 2)
                  .map(({ garage }, index) => (
                    <View key={garage.id} style={styles.recommendationItem}>
                      <Text style={styles.recommendationRank}>#{index + 1}</Text>
                      <View style={styles.recommendationContent}>
                        <Text style={styles.recommendationName}>
                          {formatGarageName(garage.name)}
                        </Text>
                        <Text style={styles.recommendationStats}>
                          {garage.total - garage.current} spots available • {garage.occupancy_percentage.toFixed(0)}% full
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Garage Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Garages</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {GARAGES.map(garage => (
                <TouchableOpacity
                  key={garage.id}
                  style={[
                    styles.pickerItem,
                    selectedGarages.includes(garage.id) && styles.pickerItemSelected,
                  ]}
                  onPress={() => toggleGarageSelection(garage.id)}
                  disabled={!selectedGarages.includes(garage.id) && selectedGarages.length >= 4}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemText}>
                      {formatGarageName(garage.name)}
                    </Text>
                    <Text style={styles.pickerItemSubtext}>{garage.code}</Text>
                  </View>
                  {selectedGarages.includes(garage.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#9ca3af",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 1,
  },
  addButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#1f1f1f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
  },
  chipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  chipClose: {
    color: "#9ca3af",
    fontSize: 20,
    fontWeight: "600",
  },
  periodButtons: {
    flexDirection: "row",
    gap: 12,
  },
  periodButton: {
    flex: 1,
    backgroundColor: "#1f1f1f",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#6366f1",
  },
  periodButtonText: {
    color: "#9ca3af",
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
    color: "#6b7280",
    fontSize: 15,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  statGarageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
    height: 40,
  },
  statRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#1f1f1f",
    marginHorizontal: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#1f1f1f",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
  comparisonTable: {
    backgroundColor: "#111",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  tableCell: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tableCellLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  tableCellHeader: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  tableCellValue: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  recommendationCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  recommendationSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationRank: {
    fontSize: 24,
    fontWeight: "800",
    color: "#6366f1",
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  recommendationStats: {
    fontSize: 13,
    color: "#9ca3af",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  doneButton: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6366f1",
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  pickerItemSelected: {
    backgroundColor: "#1f1f1f",
  },
  pickerItemText: {
    fontSize: 17,
    color: "#fff",
  },
  pickerItemSubtext: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: "#6366f1",
    fontWeight: "700",
  },
});