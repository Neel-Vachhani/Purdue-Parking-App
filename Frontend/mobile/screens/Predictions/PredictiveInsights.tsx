import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, StyleSheet, Animated } from "react-native";
import { ThemeContext } from "../../theme/ThemeProvider";

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

const WEEKDAYS = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PredictiveInsights() {
  const theme = React.useContext(ThemeContext);
  const [selectedLot, setSelectedLot] = React.useState<Lot>(PARKING_LOTS[0]);
  const [selectedHour, setSelectedHour] = React.useState<number>(new Date().getHours());
  const [selectedWeekday, setSelectedWeekday] = React.useState<string>("All Days");
  const [threshold, setThreshold] = React.useState<number>(80);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ average_occupancy: number; likely_full?: boolean } | null>(null);
  
  const [showLotPicker, setShowLotPicker] = React.useState(false);
  const [showDayPicker, setShowDayPicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showThresholdPicker, setShowThresholdPicker] = React.useState(false);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchPredictiveData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lot: selectedLot.code.toLowerCase(),
        hour: selectedHour.toString(),
        threshold: threshold.toString(),
      });
      
      if (selectedWeekday !== "All Days") {
        params.append("weekday", selectedWeekday.toLowerCase());
      }

      const res = await fetch(`http://localhost:7500/parking/hourly-average?${params.toString()}`);
      
      if (!res.ok) throw new Error("Failed to fetch data");
      
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
  }, [selectedLot, selectedHour, selectedWeekday, threshold]);

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 85) return "#ef4444";
    if (occupancy >= 70) return "#f97316";
    if (occupancy >= 50) return "#eab308";
    if (occupancy >= 30) return "#84cc16";
    return "#22c55e";
  };

  const getStatusBadge = (occupancy: number) => {
    if (occupancy >= 90) return { label: "Nearly Full", color: "#ef4444" };
    if (occupancy >= 70) return { label: "Busy", color: "#f97316" };
    if (occupancy >= 50) return { label: "Moderate", color: "#eab308" };
    return { label: "Available", color: "#22c55e" };
  };

  const formatTimeAMPM = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const formatLotName = (name: string) => {
    return name.replace(" Parking Garage", "").replace(" Parking Lot", "");
  };

  // Modal Pickers
  const renderTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <Modal visible={showTimePicker} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.pickerScroll}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.pickerItem,
                    selectedHour === hour && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedHour(hour);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedHour === hour && styles.pickerItemTextSelected
                  ]}>
                    {formatTimeAMPM(hour)}
                  </Text>
                  {selectedHour === hour && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderLotPicker = () => (
    <Modal visible={showLotPicker} transparent animationType="slide">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowLotPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Location</Text>
            <TouchableOpacity onPress={() => setShowLotPicker(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pickerScroll}>
            {PARKING_LOTS.map((lot) => (
              <TouchableOpacity
                key={lot.id}
                style={[
                  styles.pickerItem,
                  selectedLot.id === lot.id && styles.pickerItemSelected
                ]}
                onPress={() => {
                  setSelectedLot(lot);
                  setShowLotPicker(false);
                }}
              >
                <View>
                  <Text style={[
                    styles.pickerItemText,
                    selectedLot.id === lot.id && styles.pickerItemTextSelected
                  ]}>
                    {formatLotName(lot.name)}
                  </Text>
                  <Text style={styles.pickerItemSubtext}>{lot.code}</Text>
                </View>
                {selectedLot.id === lot.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderDayPicker = () => (
    <Modal visible={showDayPicker} transparent animationType="slide">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowDayPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Day</Text>
            <TouchableOpacity onPress={() => setShowDayPicker(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pickerScroll}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.pickerItem,
                  selectedWeekday === day && styles.pickerItemSelected
                ]}
                onPress={() => {
                  setSelectedWeekday(day);
                  setShowDayPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerItemText,
                  selectedWeekday === day && styles.pickerItemTextSelected
                ]}>
                  {day}
                </Text>
                {selectedWeekday === day && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderThresholdPicker = () => {
    const thresholds = [60, 65, 70, 75, 80, 85, 90, 95];
    
    return (
      <Modal visible={showThresholdPicker} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowThresholdPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Full Threshold</Text>
              <TouchableOpacity onPress={() => setShowThresholdPicker(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" }}>
              <Text style={{ fontSize: 14, color: "#9ca3af", lineHeight: 20 }}>
                Set the occupancy percentage at which a lot is considered "likely full"
              </Text>
            </View>
            
            <ScrollView style={styles.pickerScroll}>
              {thresholds.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.pickerItem,
                    threshold === t && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setThreshold(t);
                    setShowThresholdPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    threshold === t && styles.pickerItemTextSelected
                  ]}>
                    {t}% or higher
                  </Text>
                  {threshold === t && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const statusBadge = result ? getStatusBadge(result.average_occupancy) : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Parking Insights</Text>
          <Text style={styles.headerSubtitle}>Real-time availability and trends</Text>
        </View>

        {/* Location Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PARKING LOCATION</Text>
          <TouchableOpacity
            style={styles.locationCard}
            onPress={() => setShowLotPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName}>{formatLotName(selectedLot.name)}</Text>
              <Text style={styles.locationCode}>{selectedLot.code}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIME & DAY</Text>
          <View style={styles.timeRangeContainer}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>{formatTimeAMPM(selectedHour)}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowDayPicker(true)}
            >
              <Text style={styles.timeButtonText}>
                {selectedWeekday === "All Days" ? "All Days" : selectedWeekday.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Threshold Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FULL THRESHOLD</Text>
          <TouchableOpacity
            style={styles.thresholdCard}
            onPress={() => setShowThresholdPicker(true)}
          >
            <View>
              <Text style={styles.thresholdValue}>{threshold}%</Text>
              <Text style={styles.thresholdLabel}>Occupancy threshold for "likely full"</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Main Stats Card */}
        <View style={styles.statsCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Analyzing patterns...</Text>
            </View>
          ) : result ? (
            <>
              {/* Location Header */}
              <View style={styles.statsHeader}>
                <Text style={styles.statsLotName}>{formatLotName(selectedLot.name)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadge!.color }]}>
                  <Text style={styles.statusBadgeText}>{statusBadge!.label}</Text>
                </View>
              </View>

              {/* Current Status Label */}
              <Text style={styles.currentStatusLabel}>Predicted Occupancy</Text>

              {/* Big Numbers Section */}
              <View style={styles.bigNumbersContainer}>
                <View style={styles.bigNumberBox}>
                  <Text style={styles.bigNumberLabel}>Available</Text>
                  <Animated.Text style={[styles.bigNumber, { 
                    color: "#22c55e",
                    transform: [{ scale: pulseAnim }]
                  }]}>
                    {Math.round(100 - result.average_occupancy)}
                  </Animated.Text>
                </View>

                <View style={styles.bigNumberBox}>
                  <Text style={styles.bigNumberLabel}>Occupied</Text>
                  <Text style={[styles.bigNumber, { color: getOccupancyColor(result.average_occupancy) }]}>
                    {Math.round(result.average_occupancy)}
                  </Text>
                </View>

                <View style={styles.bigNumberBox}>
                  <Text style={styles.bigNumberLabel}>Total Spots</Text>
                  <Text style={[styles.bigNumber, { color: "#6b7280" }]}>100</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill,
                      { 
                        width: `${result.average_occupancy}%`,
                        backgroundColor: getOccupancyColor(result.average_occupancy)
                      }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>0%</Text>
                  <Text style={[styles.progressLabel, { fontWeight: "700" }]}>
                    {result.average_occupancy}% Full
                  </Text>
                  <Text style={styles.progressLabel}>100%</Text>
                </View>
              </View>

              {/* Trend Indicator */}
              <View style={styles.trendCard}>
                <Text style={styles.trendIcon}>📊</Text>
                <Text style={styles.trendText}>
                  Based on historical data from the past 30 days
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>✅</Text>
              <Text style={styles.noDataText}>Usually Available</Text>
              <Text style={styles.noDataSubtext}>
                This location typically has open spots at this time
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderLotPicker()}
      {renderTimePicker()}
      {renderDayPicker()}
      {renderThresholdPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#000",
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
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 1,
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  locationName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  locationCode: {
    fontSize: 14,
    color: "#6b7280",
  },
  chevron: {
    fontSize: 28,
    color: "#4b5563",
    fontWeight: "300",
  },
  timeRangeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  timeButton: {
    flex: 1,
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  thresholdCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  thresholdValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6366f1",
    marginBottom: 4,
  },
  thresholdLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  statsCard: {
    backgroundColor: "#111",
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statsLotName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  currentStatusLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 24,
  },
  bigNumbersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  bigNumberBox: {
    alignItems: "center",
  },
  bigNumberLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: "800",
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "#1f1f1f",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  trendIcon: {
    fontSize: 20,
  },
  trendText: {
    fontSize: 13,
    color: "#9ca3af",
    flex: 1,
    lineHeight: 18,
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
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
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
  pickerItemTextSelected: {
    fontWeight: "600",
    color: "#6366f1",
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