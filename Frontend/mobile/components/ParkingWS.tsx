import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

const ParkingWS: React.FC = () => {
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string>('Connecting...');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(1000);

  const getWebSocketUrl = (): string => {
    // if (__DEV__) {
    //   // Local dev
    //   let host: string;

    //   if (Platform.OS === 'android') {
    //     // Android emulator talking to your laptop
    //     host = '10.0.2.2';
    //   } else {
    //     // iOS simulator OR physical device on same Wi-Fi
    //     // use your laptop's LAN IP here if the backend is local
    //     host = '10.165.14.186'; // <- change to your actual local IP
    //   }

    //   return `ws://${host}:8000/ws/parking/`;
    // }

    // Production (Render)
    return 'wss://purdue-parking-app.onrender.com/ws/parking/';
  };


  const connect = () => {
    const wsUrl = getWebSocketUrl();
    console.log('[WebSocket] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setStatus('Connected');
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WebSocket] Received:', message);

        if (message?.type === 'parking_update' && message.data?.lot) {
          const { lot, count } = message.data;
          
          setCounters((prev) => ({
            ...prev,
            [lot]: count,
          }));

          Alert.alert(
            'Parking Update',
            `${lot}: ${count} spots available`
          );
        }
      } catch (error) {
        console.error('[WebSocket] Parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setStatus('Error');
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setStatus('Disconnected');
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WebSocket] Reconnecting...');
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        connect();
      }, reconnectDelayRef.current);
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>WebSocket: {status}</Text>
      {Object.entries(counters).map(([lot, count]) => (
        <Text key={lot} style={styles.counter}>
          {lot}: {count}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  status: {
    color: 'white',
    fontSize: 12,
  },
  counter: {
    color: 'white',
    fontSize: 10,
  },
});

export default ParkingWS;
