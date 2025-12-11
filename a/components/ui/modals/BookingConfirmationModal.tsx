import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type Booking = {
  amount: number;
  id: string;
  firestoreId?: string;
  code: string;
  pickupId: string;
  pickupName: string;
  dropoffId: string;
  dropoffName: string;
  riders: number;
  status: "Pending" | "Accepted" | "Completed" | "Cancelled";
  createdAt: number;
  slotLabel: string;
  scheduledAtMs: number;
  direction: Direction;
  userId?: string | null | undefined;
  guestId?: string | null | undefined;
  pickupIndex?: number;
  dropoffIndex?: number;
  segments?: string[];
  paymentId?: string;
  [k: string]: any;
};

type Direction = "northbound" | "southbound";

export type BookingConfirmationModalProps = {
  visible: boolean;
  booking: Booking | null;
  onDone: (b: Booking) => Promise<void>;
  onCancel: (b: Booking) => Promise<void>;
};

export default function BookingConfirmationModal({
  visible,
  booking,
  onDone,
  onCancel,
}: BookingConfirmationModalProps) {
  const [internalVisible, setInternalVisible] = useState(visible);

  const [hasCancelledOnce, setHasCancelledOnce] = useState(false);
  const [allowCancel, setAllowCancel] = useState(true);
  const [timerDone, setTimerDone] = useState(false);

  const slide = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const redColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fca5a5", "#dc2626"],
  });

  const isValid =
    booking && (booking.status === "Pending" || booking.status === "Accepted");

  /** slide down + close */
  const runCloseAnimation = (cb: () => Promise<void>) => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(async () => {
      setInternalVisible(false);
      await cb();
    });
  };

  const handleDone = async () => {
    if (!booking) return;
    runCloseAnimation(() => onDone({ ...booking, status: "Accepted" }));
  };

  const confirmCancel = () => {
    if (!booking || !allowCancel || hasCancelledOnce) return;

    Alert.alert("Cancel Booking", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          setHasCancelledOnce(true);
          setAllowCancel(false);
          setTimerDone(true);

          const updated = { ...booking, status: "Cancelled" as const };
          runCloseAnimation(() => onCancel(updated));
        },
      },
    ]);
  };

  /**
   * 🔥 FIX #1 — Reset EVERYTHING when modal opens fresh
   */
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      slide.setValue(1);

      // Reset cancel / timer states
      setHasCancelledOnce(false);
      setAllowCancel(true);
      setTimerDone(false);

      // Reset animation
      progress.setValue(0);
    }
  }, [visible]);

  /** slide up animation */
  useEffect(() => {
    if (internalVisible) {
      Animated.timing(slide, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [internalVisible]);

  /**
   * 🔥 FIX #2 — Run the cancel countdown ONLY when:
   * - modal is open
   * - booking is Pending
   */
  useEffect(() => {
    if (!internalVisible || !booking || booking.status !== "Pending") return;

    setAllowCancel(true);
    setTimerDone(false);
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 10000,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animation.start(() => {
      setTimerDone(true);
      setAllowCancel(false);
    });

    return () => animation.stop();
  }, [internalVisible, booking]);

  /** If booking already Accepted → instantly disable cancel */
  useEffect(() => {
    if (booking?.status === "Accepted") {
      setTimerDone(true);
      setAllowCancel(false);
    }
  }, [booking?.status]);

  if (!internalVisible || !isValid) return null;

  return (
    <Modal visible={internalVisible} transparent animationType="none">
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <Animated.View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: 24,
            gap: 12,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 500],
                }),
              },
            ],
          }}
        >
          {/* CODE */}
          <Text
            style={{
              fontSize: 12,
              color: "#6B7280",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            CONFIRMATION CODE
          </Text>

          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            {booking?.code}
          </Text>

          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 }} />

          {/* DETAILS */}
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Ride Details</Text>
          <Text>From: {booking?.pickupName}</Text>
          <Text>To: {booking?.dropoffName}</Text>
          <Text>Rider(s): {booking?.riders}</Text>
          <Text>Time: {booking?.slotLabel}</Text>

          {/* BUTTONS */}
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            {/* CANCEL TIMER BUTTON */}
            {booking?.status === "Pending" && allowCancel && !hasCancelledOnce && (
                <View
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#fca5a5",
                    overflow: "hidden",
                    marginRight: 10,
                  }}
                >
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width,
                      backgroundColor: redColor,
                    }}
                  />
                  <TouchableOpacity
                    onPress={confirmCancel}
                    style={{
                      height: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "600" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              )}


            {/* DONE */}
            <TouchableOpacity
              onPress={handleDone}
              style={{
                flex: allowCancel && !hasCancelledOnce ? 1 : 1.8,
                height: 50,
                borderRadius: 25,
                backgroundColor: "#2563EB",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: allowCancel && !hasCancelledOnce ? 10 : 0,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
