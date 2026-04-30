// components/ParkingPhoto.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PARKING_PHOTOS_KEY = "saved_parking_photos";
const MAX_PHOTOS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;

type ScreenMode = "menu" | "camera" | "preview" | "gallery";

export default function ParkingPhoto({ onBack }: { onBack: () => void }) {
  const theme = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<ScreenMode>("menu");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  //load saved photos from async storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PARKING_PHOTOS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setSavedPhotos(parsed);
        }
      } catch (e) {
        console.warn("Failed to load saved parking photos", e);
      }
    })();
  }, []);

  const persistPhotos = async (photos: string[]) => {
    try {
      await AsyncStorage.setItem(PARKING_PHOTOS_KEY, JSON.stringify(photos));
    } catch (e) {
      console.warn("Failed to persist parking photos", e);
    }
  };

  const handleOpenCamera = async () => {
    if (savedPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        "Photo Limit Reached",
        `You can save up to ${MAX_PHOTOS} parking photos. Delete an existing photo to take a new one.`,
        [{ text: "OK" }]
      );
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to take a photo of your parking spot.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    setMode("camera");
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setMode("preview");
      }
    } catch (e) {
      console.error("Failed to take photo", e);
      Alert.alert("Error", "Could not capture photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setMode("camera");
  };

  const handleSavePhoto = async () => {
    if (!capturedUri) return;
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(capturedUri);
      }

      const updated = [capturedUri, ...savedPhotos].slice(0, MAX_PHOTOS);
      setSavedPhotos(updated);
      await persistPhotos(updated);
      setCapturedUri(null);
      setMode("menu");
    } catch (e) {
      console.error("Failed to save parking photo", e);
      Alert.alert("Error", "Could not save photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = (index: number) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to remove this parking photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = savedPhotos.filter((_, i) => i !== index);
            setSavedPhotos(updated);
            await persistPhotos(updated);
            if (updated.length === 0) {
              setMode("menu");
            } else {
              setGalleryIndex(Math.min(galleryIndex, updated.length - 1));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "Delete All Photos",
      "Remove all saved parking photos?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setSavedPhotos([]);
            await AsyncStorage.removeItem(PARKING_PHOTOS_KEY);
            setMode("menu");
          },
        },
      ]
    );
  };

  const handleViewSaved = () => {
    if (savedPhotos.length === 0) {
      Alert.alert("No Saved Photos", "You haven't saved any parking photos yet.");
      return;
    }
    setGalleryIndex(0);
    setMode("gallery");
  };

  const headerBg = theme.mode === "dark" ? "#1b1d21" : "#ffffff";
  const cardBg = theme.mode === "dark" ? "#1e1f23" : "#f9fafb";
  const cardBorder = theme.mode === "dark" ? "#2a2d33" : "#e5e7eb";
  const mutedBg = theme.mode === "dark" ? "#2a2d33" : "#e5e7eb";
  const dangerText = theme.mode === "dark" ? "#f87171" : "#dc2626";
  const dangerBg = theme.mode === "dark" ? "#2a2d33" : "#fee2e2";

  const renderHeader = (title: string) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: insets.top + 4,
        paddingBottom: 18,
        paddingHorizontal: 16,
        backgroundColor: headerBg,
        borderBottomWidth: 1,
        borderBottomColor: cardBorder,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          if (mode === "camera" || mode === "preview" || mode === "gallery") {
            setCapturedUri(null);
            setMode("menu");
          } else {
            onBack();
          }
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ marginRight: 12 }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700", flex: 1 }}>
        {title}
      </Text>
    </View>
  );

  if (mode === "menu") {
    const latestPhoto = savedPhotos.length > 0 ? savedPhotos[0] : null;
    const photoCount = savedPhotos.length;
    const canTakeMore = photoCount < MAX_PHOTOS;

    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {renderHeader("Save Parking Location")}

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: insets.bottom + 24,
            gap: 20,
          }}
        >
          {/* Latest photo preview */}
          {latestPhoto && (
            <View
              style={{
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              <Image
                source={{ uri: latestPhoto }}
                style={{ width: "100%", height: SCREEN_WIDTH * 0.65 }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons name="images" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  {photoCount}/{MAX_PHOTOS}
                </Text>
              </View>
            </View>
          )}

          {/* No photo placeholder */}
          {!latestPhoto && (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: cardBorder,
                borderStyle: "dashed",
                height: SCREEN_WIDTH * 0.5,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cardBg,
                gap: 8,
              }}
            >
              <Ionicons name="car-outline" size={48} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontSize: 15 }}>
                No parking photo saved
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleOpenCamera}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cardBg,
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: cardBorder,
              gap: 14,
              opacity: canTakeMore ? 1 : 0.5,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: canTakeMore ? theme.primary : mutedBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="camera"
                size={24}
                color={canTakeMore ? "#ffffff" : theme.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                Take a Photo
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                {canTakeMore
                  ? `${MAX_PHOTOS - photoCount} photo${MAX_PHOTOS - photoCount !== 1 ? "s" : ""} remaining`
                  : "Photo limit reached — delete one first"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleViewSaved}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cardBg,
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: cardBorder,
              gap: 14,
              opacity: photoCount > 0 ? 1 : 0.5,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: photoCount > 0 ? mutedBg : cardBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="images"
                size={24}
                color={photoCount > 0 ? theme.primary : theme.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                View Saved Photos
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                {photoCount > 0
                  ? `${photoCount} photo${photoCount !== 1 ? "s" : ""} saved`
                  : "No photos saved yet"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (mode === "camera") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 16,
              right: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setMode("menu")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Photo {savedPhotos.length + 1} of {MAX_PHOTOS}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 32,
              alignSelf: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleTakePhoto}
              disabled={loading}
              activeOpacity={0.7}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                borderWidth: 4,
                borderColor: "#fff",
                backgroundColor: loading
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "#fff",
                  }}
                />
              )}
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (mode === "preview" && capturedUri) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image
          source={{ uri: capturedUri }}
          style={{ flex: 1, width: "100%" }}
          resizeMode="contain"
        />

        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Review Photo
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 24,
            right: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <TouchableOpacity
            onPress={handleRetake}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSavePhoto}
            disabled={loading}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: theme.primary,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                  Save
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === "gallery" && savedPhotos.length > 0) {
    const currentPhoto = savedPhotos[galleryIndex];
    const total = savedPhotos.length;

    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {renderHeader("Saved Parking Photos")}

        <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
          <View
            style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            <Image
              source={{ uri: currentPhoto }}
              style={{ width: "100%", height: SCREEN_WIDTH * 0.85 }}
              resizeMode="cover"
            />
          </View>

          {total > 1 && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 16,
                  gap: 8,
                }}
              >
                {savedPhotos.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setGalleryIndex(i)}
                    style={{
                      width: galleryIndex === i ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        galleryIndex === i ? theme.primary : mutedBg,
                    }}
                  />
                ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                  paddingHorizontal: 40,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setGalleryIndex((prev) => (prev - 1 + total) % total)
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: mutedBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 14,
                    alignSelf: "center",
                  }}
                >
                  {galleryIndex + 1} of {total}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setGalleryIndex((prev) => (prev + 1) % total)
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: mutedBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 16,
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => handleDeletePhoto(galleryIndex)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: dangerBg,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="trash-outline" size={20} color={dangerText} />
            <Text
              style={{ color: dangerText, fontSize: 15, fontWeight: "600" }}
            >
              Delete
            </Text>
          </TouchableOpacity>

          {total > 1 && (
            <TouchableOpacity
              onPress={handleDeleteAll}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: dangerBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash" size={20} color={dangerText} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleOpenCamera}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor:
                savedPhotos.length >= MAX_PHOTOS ? mutedBg : theme.primary,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: savedPhotos.length >= MAX_PHOTOS ? 0.5 : 1,
            }}
          >
            <Ionicons
              name="camera"
              size={20}
              color={
                savedPhotos.length >= MAX_PHOTOS ? theme.textMuted : "#fff"
              }
            />
            <Text
              style={{
                color:
                  savedPhotos.length >= MAX_PHOTOS ? theme.textMuted : "#fff",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  //fallback
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {renderHeader("Save Parking Location")}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    </View>
  );
}
