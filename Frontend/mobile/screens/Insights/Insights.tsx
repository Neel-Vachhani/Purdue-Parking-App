import React, { useState, useEffect, useRef, useContext } from "react";

// Types
type TimePeriod = "day" | "week" | "month";

type ParkingLot = {
  id: number;
  code: string;
  name: string;
  total: number;
};

type HistoricalDataPoint = {
  label: string;
  occupancy_percentage: number;
};

type CurrentStatus = {
  available: number;
  occupied: number;
  total: number;
  occupancy_percentage: number;
};

type PredictiveResult = {
  average_occupancy: number;
  likely_full: boolean;
};

// Mock theme context for standalone demo
const ThemeContext = React.createContext({
  mode: 'dark',
  bg: '#000000',
  text: '#ffffff'
});

const PARKING_LOTS: ParkingLot[] = [
  { id: 1, code: "PGH", name: "Harrison Street Parking Garage", total: 240 },
  { id: 2, code: "PGG", name: "Grant Street Parking Garage", total: 240 },
  { id: 3, code: "PGU", name: "University Street Parking Garage", total: 240 },
  { id: 4, code: "PGNW", name: "Northwestern Avenue Parking Garage", total: 240 },
  { id: 5, code: "PGMD", name: "McCutcheon Drive Parking Garage", total: 240 },
  { id: 6, code: "PGW", name: "Wood Street Parking Garage", total: 240 },
  { id: 7, code: "PGGH", name: "Graduate House Parking Garage", total: 240 },
  { id: 8, code: "PGM", name: "Marsteller Street Parking Garage", total: 240 },
  { id: 9, code: "LOT_R", name: "Lot R", total: 120 },
  { id: 10, code: "LOT_H", name: "Lot H", total: 80 },
  { id: 11, code: "LOT_FB", name: "Lot FB", total: 100 },
  { id: 12, code: "KFPC", name: "Kozuch Football Performance Complex Lot", total: 100 },
  { id: 13, code: "LOT_A", name: "Lot A", total: 120 },
  { id: 14, code: "CREC", name: "Co-Rec Parking Lots", total: 150 },
];

const WEEKDAYS: string[] = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type TimePeriodSelectorProps = {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
};

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ value, onChange }) => {
  const periods: Array<{ value: TimePeriod; label: string }> = [
    { value: "day", label: "24 Hours" },
    { value: "week", label: "7 Days" },
    { value: "month", label: "30 Days" }
  ];

  return (
    <div className="flex gap-2 mb-6">
      {periods.map(period => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            value === period.value
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

type BarChartProps = {
  data: HistoricalDataPoint[];
  period: TimePeriod;
};

const BarChart: React.FC<BarChartProps> = ({ data, period }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.occupancy_percentage), 100);

  const getBarColor = (percentage: number): string => {
    if (percentage >= 85) return '#ef4444';
    if (percentage >= 70) return '#f97316';
    if (percentage >= 50) return '#eab308';
    if (percentage >= 30) return '#84cc16';
    return '#22c55e';
  };

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-2 h-64 px-4">
        {data.map((item, index) => {
          const heightPercent = (item.occupancy_percentage / maxValue) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="relative w-full flex flex-col items-center justify-end h-full">
                <span className="text-xs font-bold text-white mb-1">
                  {Math.round(item.occupancy_percentage)}%
                </span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: getBarColor(item.occupancy_percentage),
                    minHeight: '8px'
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 text-center break-words w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Y-axis grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {[0, 25, 50, 75, 100].map(val => (
          <div
            key={val}
            className="absolute left-0 right-0 border-t border-gray-800"
            style={{ bottom: `${(val / maxValue) * 100}%` }}
          >
            <span className="absolute -left-8 -translate-y-1/2 text-xs text-gray-500">
              {val}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Insights() {
  const theme = useContext(ThemeContext);
  
  // Predictive insights state
  const [selectedLot, setSelectedLot] = useState<ParkingLot>(PARKING_LOTS[0]);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedWeekday, setSelectedWeekday] = useState<string>("All Days");
  const [threshold, setThreshold] = useState<number>(80);
  const [predictiveResult, setPredictiveResult] = useState<PredictiveResult | null>(null);
  
  // Historical data state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"current" | "predictive">("current");
  const [showLotPicker, setShowLotPicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [showDayPicker, setShowDayPicker] = useState<boolean>(false);
  const [showThresholdPicker, setShowThresholdPicker] = useState<boolean>(false);

  // Fetch current status and historical data
  useEffect(() => {
    fetchCurrentAndHistoricalData();
  }, [selectedLot, timePeriod]);

  // Fetch predictive data
  useEffect(() => {
    if (activeTab === "predictive") {
      fetchPredictiveData();
    }
  }, [selectedLot, selectedHour, selectedWeekday, threshold, activeTab]);

  const fetchCurrentAndHistoricalData = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual endpoint
      const response = await fetch(
        `http://localhost:7500/postgres-parking?lot=${selectedLot.code.toLowerCase()}&period=${timePeriod}`
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        // Get latest data point for current status
        const latest = data[data.length - 1];
        const occupied = selectedLot.total - latest.availability;
        
        setCurrentStatus({
          available: latest.availability,
          occupied: occupied,
          total: selectedLot.total,
          occupancy_percentage: (occupied / selectedLot.total) * 100
        });

        // Process historical data for chart
        const processedData = aggregateData(
          data.map(d => ({
            timestamp: new Date(d.timestamp),
            availability: d.availability,
            occupancy_percentage: ((selectedLot.total - d.availability) / selectedLot.total) * 100
          })),
          timePeriod
        );
        
        setHistoricalData(processedData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      // Use mock data for demo
      setCurrentStatus({
        available: 80,
        occupied: 160,
        total: selectedLot.total,
        occupancy_percentage: 66.7
      });
      setHistoricalData(generateMockData(timePeriod));
    } finally {
      setLoading(false);
    }
  };

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
      const data = await res.json();
      
      const average_occupancy = selectedLot.total - data.average_availability;
      setPredictiveResult({
        ...data,
        average_occupancy: average_occupancy,
        likely_full: average_occupancy >= threshold,
      });
    } catch (error) {
      console.error("Error fetching predictive data:", error);
      // Mock data for demo
      setPredictiveResult({
        average_occupancy: 150,
        likely_full: false
      });
    } finally {
      setLoading(false);
    }
  };

  const aggregateData = (
    data: Array<{ timestamp: Date; availability: number; occupancy_percentage: number }>,
    period: TimePeriod
  ): HistoricalDataPoint[] => {
    const segments = period === "day" ? 6 : period === "week" ? 7 : 5;
    const chunkSize = Math.ceil(data.length / segments);
    const aggregated: HistoricalDataPoint[] = [];

    for (let i = 0; i < segments; i++) {
      const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;

      const avgOccupancy = chunk.reduce((sum, d) => sum + d.occupancy_percentage, 0) / chunk.length;

      let label = "";
      if (period === "day") {
        const startHour = chunk[0].timestamp.getHours();
        label = `${startHour.toString().padStart(2, "0")}:00`;
      } else if (period === "week") {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        label = weekdays[chunk[0].timestamp.getDay()];
      } else {
        label = `Wk ${i + 1}`;
      }

      aggregated.push({ label, occupancy_percentage: avgOccupancy });
    }

    return aggregated;
  };

  const generateMockData = (period: TimePeriod): HistoricalDataPoint[] => {
    const segments = period === "day" ? 6 : period === "week" ? 7 : 5;
    return Array.from({ length: segments }, (_, i) => {
      let label = "";
      if (period === "day") label = `${(i * 4).toString().padStart(2, "0")}:00`;
      else if (period === "week") label = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
      else label = `Wk ${i + 1}`;
      
      return {
        label,
        occupancy_percentage: 30 + Math.random() * 60
      };
    });
  };

  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 85) return "#ef4444";
    if (percentage >= 70) return "#f97316";
    if (percentage >= 50) return "#eab308";
    if (percentage >= 30) return "#84cc16";
    return "#22c55e";
  };

  const getStatusBadge = (percentage: number): { label: string; color: string } => {
    if (percentage >= 90) return { label: "Nearly Full", color: "#ef4444" };
    if (percentage >= 70) return { label: "Busy", color: "#f97316" };
    if (percentage >= 50) return { label: "Moderate", color: "#eab308" };
    return { label: "Available", color: "#22c55e" };
  };

  const formatTimeAMPM = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const formatLotName = (name: string): string => {
    return name.replace(" Parking Garage", "").replace(" Parking Lot", "");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-5 pt-16 pb-6">
        <h1 className="text-4xl font-extrabold mb-2">Parking Insights</h1>
        <p className="text-gray-400 text-base">Real-time availability and trends</p>
      </div>

      {/* Tab Selector */}
      <div className="px-5 mb-6">
        <div className="flex gap-2 bg-gray-900 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("current")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "current"
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Current Status
          </button>
          <button
            onClick={() => setActiveTab("predictive")}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "predictive"
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Predictive
          </button>
        </div>
      </div>

      {/* Location Selector */}
      <div className="px-5 mb-5">
        <label className="text-xs font-bold text-gray-500 tracking-wider mb-3 block">
          PARKING LOCATION
        </label>
        <div className="relative">
          <button
            onClick={() => setShowLotPicker(!showLotPicker)}
            className="w-full bg-gray-900 rounded-2xl p-5 flex justify-between items-center border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div>
              <div className="text-lg font-semibold">{formatLotName(selectedLot.name)}</div>
              <div className="text-sm text-gray-500">{selectedLot.code}</div>
            </div>
            <span className="text-3xl text-gray-600 font-light">›</span>
          </button>

          {showLotPicker && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-2xl border border-gray-800 max-h-64 overflow-y-auto z-50 shadow-2xl">
              {PARKING_LOTS.map(lot => (
                <button
                  key={lot.id}
                  onClick={() => {
                    setSelectedLot(lot);
                    setShowLotPicker(false);
                  }}
                  className={`w-full p-4 text-left border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors ${
                    selectedLot.id === lot.id ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="font-medium">{formatLotName(lot.name)}</div>
                  <div className="text-sm text-gray-500">{lot.code}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Status Tab */}
      {activeTab === "current" && (
        <div className="px-5">
          <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />

          {/* Current Stats Card */}
          {currentStatus && (
            <div className="bg-gray-900 rounded-3xl p-6 mb-6 border border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{formatLotName(selectedLot.name)}</h3>
                  <p className="text-sm text-gray-500">Current Status</p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${getStatusBadge(currentStatus.occupancy_percentage).color}20`, color: getStatusBadge(currentStatus.occupancy_percentage).color }}
                >
                  {getStatusBadge(currentStatus.occupancy_percentage).label}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">Available</div>
                  <div className="text-3xl font-extrabold text-green-500">{currentStatus.available}</div>
                </div>
                <div className="text-center border-x border-gray-800">
                  <div className="text-sm text-gray-500 mb-2">Occupied</div>
                  <div className="text-3xl font-extrabold text-red-500">{currentStatus.occupied}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">Total</div>
                  <div className="text-3xl font-extrabold text-gray-500">{currentStatus.total}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${currentStatus.occupancy_percentage}%`,
                      backgroundColor: getOccupancyColor(currentStatus.occupancy_percentage)
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>0%</span>
                  <span className="font-bold">{Math.round(currentStatus.occupancy_percentage)}% Full</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-4">
                <span className="text-2xl">📊</span>
                <p className="text-sm text-gray-400">Based on real-time sensor data</p>
              </div>
            </div>
          )}

          {/* Historical Bar Chart */}
          <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
            <h3 className="text-lg font-bold mb-6">Occupancy Trend</h3>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : (
              <BarChart data={historicalData} period={timePeriod} />
            )}
          </div>
        </div>
      )}

      {/* Predictive Tab */}
      {activeTab === "predictive" && (
        <div className="px-5">
          {/* Time & Day Selector */}
          <div className="mb-5">
            <label className="text-xs font-bold text-gray-500 tracking-wider mb-3 block">
              TIME & DAY
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTimePicker(!showTimePicker)}
                className="flex-1 bg-indigo-600 py-4 rounded-xl font-semibold"
              >
                {formatTimeAMPM(selectedHour)}
              </button>
              <button
                onClick={() => setShowDayPicker(!showDayPicker)}
                className="flex-1 bg-indigo-600 py-4 rounded-xl font-semibold"
              >
                {selectedWeekday === "All Days" ? "All Days" : selectedWeekday.slice(0, 3)}
              </button>
            </div>
          </div>

          {/* Threshold Selector */}
          <div className="mb-6">
            <label className="text-xs font-bold text-gray-500 tracking-wider mb-3 block">
              FULL THRESHOLD
            </label>
            <button
              onClick={() => setShowThresholdPicker(!showThresholdPicker)}
              className="w-full bg-gray-900 rounded-2xl p-5 flex justify-between items-center border border-gray-800"
            >
              <div>
                <div className="text-2xl font-bold text-indigo-500 mb-1">{threshold}%</div>
                <div className="text-sm text-gray-500">Occupancy threshold for "likely full"</div>
              </div>
              <span className="text-3xl text-gray-600 font-light">›</span>
            </button>
          </div>

          {/* Predictive Results */}
          <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
            {loading ? (
              <div className="flex flex-col items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                <p className="text-gray-500">Analyzing patterns...</p>
              </div>
            ) : predictiveResult ? (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{formatLotName(selectedLot.name)}</h3>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${getStatusBadge(predictiveResult.average_occupancy).color}20`,
                      color: getStatusBadge(predictiveResult.average_occupancy).color
                    }}
                  >
                    {getStatusBadge(predictiveResult.average_occupancy).label}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">Predicted Occupancy</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">Available</div>
                    <div className="text-4xl font-extrabold text-green-500">
                      {Math.round(selectedLot.total - predictiveResult.average_occupancy)}
                    </div>
                  </div>
                  <div className="text-center border-x border-gray-800">
                    <div className="text-sm text-gray-500 mb-2">Occupied</div>
                    <div className="text-4xl font-extrabold" style={{ color: getOccupancyColor(predictiveResult.average_occupancy) }}>
                      {Math.round(predictiveResult.average_occupancy)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">Total</div>
                    <div className="text-4xl font-extrabold text-gray-500">{selectedLot.total}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${predictiveResult.average_occupancy}%`,
                        backgroundColor: getOccupancyColor(predictiveResult.average_occupancy)
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>0%</span>
                    <span className="font-bold">{Math.round(predictiveResult.average_occupancy)}% Full</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-4">
                  <span className="text-2xl">📊</span>
                  <p className="text-sm text-gray-400">Based on historical data from the past 30 days</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-16">
                <span className="text-5xl mb-4">✅</span>
                <h4 className="text-xl font-semibold mb-2">Usually Available</h4>
                <p className="text-sm text-gray-500 text-center">
                  This location typically has open spots at this time
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simple Modals */}
      {showTimePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end z-50" onClick={() => setShowTimePicker(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Select Time</h3>
              <button onClick={() => setShowTimePicker(false)} className="text-indigo-500 font-semibold">Done</button>
            </div>
            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
              <button
                key={hour}
                onClick={() => {
                  setSelectedHour(hour);
                  setShowTimePicker(false);
                }}
                className={`w-full p-4 text-left border-b border-gray-800 hover:bg-gray-800 ${
                  selectedHour === hour ? 'bg-gray-800 text-indigo-500 font-semibold' : ''
                }`}
              >
                {formatTimeAMPM(hour)}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDayPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end z-50" onClick={() => setShowDayPicker(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Select Day</h3>
              <button onClick={() => setShowDayPicker(false)} className="text-indigo-500 font-semibold">Done</button>
            </div>
            {WEEKDAYS.map(day => (
              <button
                key={day}
                onClick={() => {
                  setSelectedWeekday(day);
                  setShowDayPicker(false);
                }}
                className={`w-full p-4 text-left border-b border-gray-800 hover:bg-gray-800 ${
                  selectedWeekday === day ? 'bg-gray-800 text-indigo-500 font-semibold' : ''
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {showThresholdPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end z-50" onClick={() => setShowThresholdPicker(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Full Threshold</h3>
              <button onClick={() => setShowThresholdPicker(false)} className="text-indigo-500 font-semibold">Done</button>
            </div>
            <div className="p-5 border-b border-gray-800">
              <p className="text-sm text-gray-400">Set the occupancy percentage at which a lot is considered "likely full"</p>
            </div>
            {[60, 65, 70, 75, 80, 85, 90, 95].map(t => (
              <button
                key={t}
                onClick={() => {
                  setThreshold(t);
                  setShowThresholdPicker(false);
                }}
                className={`w-full p-4 text-left border-b border-gray-800 hover:bg-gray-800 ${
                  threshold === t ? 'bg-gray-800 text-indigo-500 font-semibold' : ''
                }`}
              >
                {t}% or higher
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}