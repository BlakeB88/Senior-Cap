import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookingSheet({
  pickup_idx,
  dropoff_idx,
  labels,
  stops,
  direction,
  time_idx,
  timeOptions,
  riders,
  set_riders,
  seatsLeft,
  canContinue,
  loading,
  submitting,
  handleContinue,
  set_pickup,
  set_dropoff,
  set_time,
  mapRef,
  BUSCAPACITY,
}: any) {
  const insets = useSafeAreaInsets();

  /* ---------------------------
      SLIDE-UP ANIMATION
  ---------------------------- */
  const slide = useRef(new Animated.Value(0)).current;

const [open, setOpen] = useState(false);

const toggle = () => {
  const toValue = open ? 0 : 1;

  Animated.timing(slide, {
    toValue,
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start(() => {
    setOpen(!open);
  });
};


  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [800, 0],
  });

  /* ---------------------------
      DERIVED VALUE:
      Continue only valid if:
      • pickup selected
      • dropoff selected
      • time selected
      • seats available
  ---------------------------- */
  const allowContinue = useMemo(() => {
    if (pickup_idx < 0) return false;
    if (dropoff_idx < 0) return false;
    if (pickup_idx === dropoff_idx) return false;
    if (time_idx < 0) return false;
    if (seatsLeft === 0) return false;
    return true;
  }, [pickup_idx, dropoff_idx, time_idx, seatsLeft]);

  /* ---------------------------
      REUSABLE SELECT ROW
  ---------------------------- */
  function SelectRow({ icon, label, valueLabel, options, onChoose, disabled }: any) {
    const [open, setOpen] = useState(false);

    return (
      <>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => !disabled && setOpen(true)}
          style={{
            backgroundColor: "#f8f8f8",
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: 14,
            marginBottom: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name={icon}
              size={22}
              color="#4b975a"
              style={{ marginRight: 10, }}
            />
            <View>
              <Text style={{ color: "#666", fontSize: 13 }}>{label}</Text>
              {valueLabel && (
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
                  {valueLabel}
                </Text>
              )}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
        </TouchableOpacity>

        <Modal
          transparent
          visible={open}
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
            onPress={() => setOpen(false)}
          />

          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              maxHeight: 420,
              paddingTop: 14,
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 45,
                height: 5,
                backgroundColor: "#d1d5db",
                borderRadius: 4,
                marginBottom: 12,
              }}
            />

            <FlatList
              data={options}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#f1f1f1",
                    marginVertical: 6,
                  }}
                />
              )}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChoose(index);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={18}
                    color="#333"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      </>
    );
  }

  /* ---------------------------
      MAIN UI
  ---------------------------- */
  return (
    <>
      <TouchableOpacity
  onPress={toggle}
  activeOpacity={0.9}
  style={{
    position: "absolute",
    bottom: 35,
    left: 75,
    right: 75,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#1E3A8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  }}
>
  <Text
    style={{
      color: "white",
      fontSize: 16,
      fontWeight: "600",
      marginRight: 8,
    }}
  >
    Book Ride
  </Text>
  <Ionicons name="chevron-up" size={18} color="white" />
</TouchableOpacity>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: insets.bottom + 60,
          paddingTop: 26,
          paddingHorizontal: 18,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 10,
          transform: [{ translateY }],
        }}
      >
        <SelectRow
          icon="map-marker-outline"
          label="Where from?"
          valueLabel={pickup_idx >= 0 ? labels[pickup_idx] : undefined}
          options={labels}
          onChoose={(i: number) => {
            set_pickup(i);
            const s = stops[i];
            mapRef.current?.animateCamera({
              center: { latitude: s.latitude, longitude: s.longitude },
              zoom: 15,
            });
          }}
        />

        <SelectRow
          icon="flag-checkered"
          label="Where to?"
          valueLabel={dropoff_idx >= 0 ? labels[dropoff_idx] : undefined}
          options={labels}
          onChoose={(i: number) => {
            set_dropoff(i);
            const s = stops[i];
            mapRef.current?.animateCamera({
              center: { latitude: s.latitude, longitude: s.longitude },
              zoom: 15,
            });
          }}
        />

        <SelectRow
          icon="clock-outline"
          label={
            direction
              ? `When? (${direction === "northbound" ? "Northbound" : "Southbound"})`
              : "When?"
          }
          valueLabel={time_idx >= 0 ? timeOptions[time_idx] : undefined}
          options={timeOptions}
          onChoose={(i: number) => set_time(i)}
          disabled={pickup_idx < 0 || dropoff_idx < 0}
        />

        {/* RIDERS */}
        <View
          style={{
            marginTop: 6,
            backgroundColor: "#f8f8f8",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color="#4b975a"
            style={{ marginRight: 10 }}
          />

          <Text style={{ fontWeight: "600", fontSize: 15, marginRight: 130 }}>
            Riders
          </Text>

          <Pressable
            onPress={() => set_riders((r: number) => Math.max(1, r - 1))}
            style={{ paddingHorizontal: 12 }}
          >
            <Text style={{ fontSize: 20 }}>−</Text>
          </Pressable>

          <Text style={{ fontSize: 16, fontWeight: "700", marginHorizontal: 12 }}>
            {riders}
          </Text>

          <Pressable
            disabled={seatsLeft !== null && riders >= seatsLeft}
            onPress={() =>
              set_riders((r: number) =>
                Math.min(r + 1, Math.max(1, seatsLeft ?? BUSCAPACITY))
              )
            }
            style={{
              paddingHorizontal: 12,
              opacity: seatsLeft !== null && riders >= seatsLeft ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 20 }}>+</Text>
          </Pressable>
        </View>

        {seatsLeft !== null && (
          <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Seats left: {seatsLeft}
          </Text>
        )}

        {/* CONTINUE BUTTON */}
        <TouchableOpacity
          disabled={!allowContinue || submitting}
          onPress={handleContinue}
          style={{
            backgroundColor: allowContinue ? "#4b975a" : "#9CA3AF",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 18,
            opacity: loading ? 0.7 : 1,
            marginBottom: 20
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
            {submitting ? "Working…" : "Continue"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}
