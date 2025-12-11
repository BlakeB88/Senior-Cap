// app/(tabs)/driver-dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, deleteDoc, doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/AppText";
import { auth, db } from "../../firebaseConfig";
import {
  SHUTTLE_DOC_ID // Import the constant
  ,









  startShuttleBroadcast
} from "../services/shuttleLocation";

type Booking = {
  id: string;
  code: string;
  pickupName: string;
  dropoffName: string;
  riders: number;
  status: "pending" | "Accepted" | "Complete";
  createdAt: any;
  userId: string | null;
  guestId: string | null;
  createdBy?: string | null;
};

const SwipeableBookingCard = ({
  booking,
  onAccept,
  onComplete,
  onDelete,
}: {
  booking: Booking;
  onAccept: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) => {
  const [translateX] = useState(new Animated.Value(0));

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) > 5,
    onPanResponderMove: (_, gestureState) => {
      // Allow swiping both left and right with smoother movement
      if (gestureState.dx < 0) {
        // Swipe left (complete)
        translateX.setValue(Math.max(gestureState.dx, -100));
      } else if (gestureState.dx > 0) {
        // Swipe right (delete)
        translateX.setValue(Math.min(gestureState.dx, 100));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50) {
        // Swiped left - show complete option
        Animated.spring(translateX, {
          toValue: -100,
          useNativeDriver: true,
          friction: 8, // Lower = bouncier, higher = stiffer
          tension: 40, // Higher = faster
        }).start();
      } else if (gestureState.dx > 50) {
        // Swiped right - show delete option
        Animated.spring(translateX, {
          toValue: 100,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      } else {
        // Return to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      }
    },
  });

  const handleComplete = () => {
    Animated.timing(translateX, {
      toValue: -400,
      duration: 300,
      useNativeDriver: true,
    }).start(onComplete);
  };

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(onDelete);
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Left side - Complete button */}
      <View style={styles.completeBackground}>
        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Ionicons name="checkmark-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Right side - Delete button */}
      <View style={styles.deleteBackground}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.bookingCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.bookingHeader}>
          <AppText style={styles.bookingLabel}>Code:</AppText>
          <AppText style={styles.bookingCode}>{booking.code}</AppText>
        </View>

        <View style={styles.bookingDetail}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <AppText style={styles.bookingText}>
            From: {booking.pickupName}
          </AppText>
        </View>

        <View style={styles.bookingDetail}>
          <Ionicons name="flag-outline" size={16} color="#6B7280" />
          <AppText style={styles.bookingText}>
            To: {booking.dropoffName}
          </AppText>
        </View>

        <View style={styles.bookingDetail}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <AppText style={styles.bookingText}>
            Riders: {booking.riders}
          </AppText>
        </View>

        {booking.status === "pending" && (
            <TouchableOpacity
              style={{
                backgroundColor: "#3B82F6",
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
                alignItems: "center",
              }}
              onPress={() => onAccept?.()}
            >
              <AppText style={{ color: "#fff", fontWeight: "600" }}>
                Accept Ride
              </AppText>
            </TouchableOpacity>
          )}

      </Animated.View>
    </View>
  );
};

const DriverDashboard = () => {
  const [driverName, setDriverName] = useState<string>("Driver");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeView, setActiveView] = useState<"home" | "rides" | "reviews">(
    "home"
  );

  // 🔵 shuttle broadcast state
  const [broadcasting, setBroadcasting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const broadcastCleanupRef = useRef<null | (() => void)>(null);

  const router = useRouter();
  const navigation = useNavigation();

  // auth + driver name
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "userInfo", user.uid));
      const data = userDoc.data() as any;
      setDriverName(data?.firstName || "Driver");
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // bookings listener
  useEffect(() => {
    const q = query(
      collection(db, "booking"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const b: Booking[] = snapshot.docs
        .map((d) => {
          const data = d.data() as any;
          // Show accepted rides OR phone-ai pending rides
          if (data.status !== "Accepted" && data.createdBy !== "phone-ai") return null;
          return {
            id: d.id,
            code: data.code ?? "",
            pickupName: data.pickupName ?? "",
            dropoffName: data.dropoffName ?? "",
            riders: data.riders ?? 1,
            status: data.status ?? "Accepted",
            createdAt: data.createdAt,
            userId: data.userId ?? null,
            guestId: data.guestId ?? null,
            createdBy: data.createdBy ?? null,
          } as Booking;
        })
        .filter((x): x is Booking => x !== null);
      setBookings(b);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      if (broadcastCleanupRef.current) {
        broadcastCleanupRef.current();
        broadcastCleanupRef.current = null;
        setBroadcasting(false);
      }
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, "booking", bookingId), {
        status: "Complete",
      });
      Alert.alert("Success", "Booking marked as complete");
    } catch (error) {
      console.error("Error completing booking:", error);
      Alert.alert("Error", "Failed to complete booking");
    }
  };

  async function stopShuttleBroadcast() {
  try {
    await deleteDoc(doc(db, "shuttleLocation", SHUTTLE_DOC_ID));  // Use SHUTTLE_DOC_ID instead of "current"
    console.log("Shuttle location cleared.");
  } catch (err) {
    console.error("Failed to clear shuttle location:", err);
  }
}

  // 🔵 start/stop broadcasting location
  const handleToggleBroadcast = async () => {
  if (broadcasting) {
    // Stop GPS streaming
    if (broadcastCleanupRef.current) {
      broadcastCleanupRef.current();
      broadcastCleanupRef.current = null;
    }

    // 🆕 Clear shuttle location from Firestore
    await stopShuttleBroadcast();

    setBroadcasting(false);
    setLocationError(null);
    return;
  }

  // Starting broadcast...
  if (!auth.currentUser) {
    Alert.alert(
      "Not signed in",
      "You must be signed in as the driver to share location."
    );
    return;
  }


  setLocationError(null);
    const cleanup = startShuttleBroadcast((err) => {
      console.error("Location error:", err);
      setLocationError("Unable to access GPS. Check permissions.");
      setBroadcasting(false);
    });

    broadcastCleanupRef.current = cleanup;
    setBroadcasting(true);
  };


  // stop broadcasting on unmount
  useEffect(() => {
    return () => {
      if (broadcastCleanupRef.current) {
        broadcastCleanupRef.current();
      }
    };
  }, []);

  const handleDeleteBooking = async (bookingId: string) => {
  try {
    await deleteDoc(doc(db, "booking", bookingId));
    Alert.alert("Success", "Booking deleted");
  } catch (error) {
    console.error("Error deleting booking:", error);
    Alert.alert("Error", "Failed to delete booking");
  }
};

  const handleAcceptBooking = async (bookingId: string) => {
  try {
    await updateDoc(doc(db, "booking", bookingId), {
      status: "Accepted",
    });
    Alert.alert("Ride accepted");
  } catch (error) {
    console.error("Error accepting booking:", error);
    Alert.alert("Error", "Failed to accept ride");
  }
};

  const activeBookings = bookings.filter(
  (b) => b.status === "Accepted" || b.createdBy === "phone-ai"
);

  return (
    <SafeAreaView style={styles.container}>
      {activeView === "home" && (
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText style={styles.greeting}>Hello, {driverName}</AppText>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={24} color="#3662AA" />
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={["#10833aff", "#1d703cff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              width: 60,
              height: 60,
              borderRadius: 30,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              activeOpacity={0.8}
              style={{
                justifyContent: "center",
                alignItems: "center",
                width: 60,
                height: 60,
                borderRadius: 30,
              }}
            >
              <Ionicons name="menu" size={26} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <AppText style={styles.subtitle}>Let’s get driving!</AppText>

          {/* 🔵 Toggle shuttle tracking */}
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              style={[
                styles.navButton,
                broadcasting && { backgroundColor: "#DCFCE7" },
              ]}
              onPress={handleToggleBroadcast}
            >
              <Ionicons
                name={broadcasting ? "radio" : "radio-outline"}
                size={20}
                color={broadcasting ? "#16A34A" : "#3662AA"}
              />
              <AppText style={styles.navButtonText}>
                {broadcasting
                  ? "Stop sharing shuttle location"
                  : "Start sharing shuttle location"}
              </AppText>
            </TouchableOpacity>
            {locationError && (
              <AppText
                style={{ color: "#DC2626", marginTop: 8, fontSize: 12 }}
              >
                {locationError}
              </AppText>
            )}
          </View>

          {/* Today's Ride Section (static for now) */}
          <View style={styles.infoCard}>
            <AppText style={styles.infoTitle}>Today's Ride</AppText>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#3bbc4eff" />
              <AppText style={styles.infoText}>Start time: 8:00 AM</AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="bus-outline" size={18} color="#3bbc4eff" />
              <AppText style={styles.infoText}>
                First stop: Main Street Station
              </AppText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#3bbc4eff" />
              <AppText style={styles.infoText}>
                First passenger: John Doe
              </AppText>
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setActiveView("rides")}
            >
              <Ionicons name="calendar-outline" size={20} color="#3662AA" />
              <AppText style={styles.navButtonText}>Check Rides</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setActiveView("reviews")}
            >
              <Ionicons name="star-outline" size={20} color="#3662AA" />
              <AppText style={styles.navButtonText}>Reviews</AppText>
            </TouchableOpacity>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <AppText style={styles.statNumber}>
                {activeBookings.length}
              </AppText>
              <AppText style={styles.statLabel}>Active Rides</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText style={styles.statNumber}>
                {bookings.filter((b) => b.status === "Accepted").length}
              </AppText>
              <AppText style={styles.statLabel}>Completed</AppText>
            </View>
          </View>
        </View>
      )}

      {activeView === "rides" && (
        <View style={styles.content}>
          <View style={styles.listHeader}>
            <AppText style={styles.listTitle}>Check Rides</AppText>
            <AppText style={styles.driverSubtitle}>
              Welcome back, {driverName} 👋
            </AppText>
          </View>

          <ScrollView style={styles.scrollView}>
            {activeBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                <AppText style={styles.emptyText}>No upcoming rides</AppText>
              </View>
            ) : (
              activeBookings.map((booking) => (
                <SwipeableBookingCard
                  key={booking.id}
                  booking={booking}
                  onAccept={() => handleAcceptBooking(booking.id)}
                  onComplete={() => handleCompleteBooking(booking.id)}
                  onDelete={() => handleDeleteBooking(booking.id)}
                />
              ))
            )}
          </ScrollView>

          <Pressable
            onPress={() => setActiveView("home")}
            style={styles.backPressable}
          >
            <LinearGradient
              colors={["#14b861ff", "#3bbc4eff"]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <AppText style={styles.backText}>Back</AppText>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {activeView === "reviews" && (
        <View style={styles.content}>
          <View style={styles.listHeader}>
            <AppText style={styles.listTitle}>Reviews</AppText>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color="#9CA3AF" />
              <AppText style={styles.emptyText}>No reviews yet</AppText>
              <AppText style={styles.emptySubtext}>
                Passenger reviews will appear here
              </AppText>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setActiveView("home")}
          >
            <AppText style={styles.backButtonText}>Back to Dashboard</AppText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 80,
  },
  greeting: { fontSize: 36, fontWeight: "bold" },
  subtitle: { fontSize: 20, marginBottom: 40, color: "#000" },
  logoutBtn: { padding: 8 },
  buttonContainer: { gap: 20 },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F0FE",
    padding: 25,
    borderRadius: 14,
  },
  navButtonText: { fontSize: 18, fontWeight: "600", color: "#3662AA" },
  statsContainer: { flexDirection: "row", gap: 15, marginTop: 40 },
  statCard: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: { fontSize: 32, fontWeight: "bold", color: "#3662AA" },
  statLabel: { fontSize: 14, color: "#6B7280" },
  listHeader: { marginBottom: 20, alignItems: "center", marginTop: 70 },
  listTitle: { fontSize: 28, fontWeight: "bold", color: "#111827" },
  driverSubtitle: { color: "#6B7280", marginTop: 4, fontSize: 14 },

  // Today's Ride styles
  infoCard: {
    backgroundColor: "#F3F4F6",
    padding: 18,
    borderRadius: 12,
    marginVertical: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
  },

  scrollView: { flex: 1 },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { marginTop: 12, fontSize: 18, fontWeight: "600" },
  emptySubtext: { marginTop: 4, fontSize: 14, color: "#6B7280" },

  backPressable: { marginTop: 16 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 999,
  },
  backText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },

  // swipe card styles
  swipeContainer: {
    marginBottom: 16,
  },
  completeBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  completeButton: {
    padding: 10,
  },
  // delete (right/left) background for swipe-to-delete
  deleteBackground: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  deleteButton: {
    padding: 10,
  },
  bookingCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bookingLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: "600",
  },
  bookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  bookingText: {
    fontSize: 14,
    color: "#111827",
  },
  completeOverlay: {
    position: "absolute",
    right: 16,
    top: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completeText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  deleteOverlay: {
    position: "absolute",
    left: 16,
    top: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
});