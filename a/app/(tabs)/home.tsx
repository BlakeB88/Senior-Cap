// home.tsx — refactored + priority queue + shuttle arrival processing
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useStripe } from "@stripe/stripe-react-native";
import BookingConfirmationModal from "components/ui/modals/BookingConfirmationModal";
import BookingSheet from "components/ui/modals/BookingSheet";
import RideReviewModal from "components/ui/modals/RideReviewModal";
import { LinearGradient } from "expo-linear-gradient";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { AnimatedRegion, Marker, MarkerAnimated } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../../constants/theme";
import { useGuest } from "../../context/GuestUser";
import { auth, db } from "../../firebaseConfig";
import {
  subscribeToShuttleLocation
} from "../services/shuttleLocation";

/* ----------------------
   Types and constants
   ---------------------- */

interface HelpStep {
  title: string;
  description: string;
}

const HELP_STEPS: HelpStep[] = [
  {
    title: "Choose pickup",
    description:
      "Tap “Where from? - Tap to select” to choose where you want to be picked up.",
  },
  {
    title: "Choose destination",
    description:
      "Tap “Where to? - Tap to select” and pick where you want to go.",
  },
  {
    title: "Choose time",
    description:
      "Tap “When? - Tap to select” to choose the day and time for your ride.",
  },
  {
    title: "Set riders & continue",
    description:
      "Set how many riders are in your group, then tap “Continue” to request the shuttle.",
  },
];

type Stop = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  order: number;
  [k: string]: any;
};

const BUSCAPACITY = 5;

const ROUTE_ORDER: string[] = [
  "stop1",
  "stop4",
  "stop2",
  "stop5",
  "stop6",
  "stop7",
  "stop8",
  "stop3",
  "stop9",
];

type Direction = "northbound" | "southbound";

const TIME_SLOTS_BY_DIR: Record<Direction, string[]> = {
  northbound: ["7:00 AM", "8:00 AM", "4:00 PM", "5:00 PM"],
  southbound: ["6:30 AM", "7:30 AM", "3:30 PM", "4:30 PM"],
};

type Booking = {
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
  rating?: number | null;
  reviewText?: string | null;
  reviewedAt?: number | null;
};

/* ----------------------
   Small helpers
   ---------------------- */

function idxOf(id: string) {
  return ROUTE_ORDER.indexOf(id);
}

function segmentsBetween(pickupId: string, dropoffId: string): string[] {
  const i = idxOf(pickupId);
  const j = idxOf(dropoffId);
  if (i === -1 || j === -1) return [];
  const segs: string[] = [];
  const step = j > i ? 1 : -1;
  for (let k = i; k !== j; k += step) {
    const a = ROUTE_ORDER[k];
    const b = ROUTE_ORDER[k + step];
    segs.push(`${a}|${b}`);
  }
  return segs;
}

function dayBoundsFor(ms: number) {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ----------------------
   Priority queue builder
   - Lower number = higher priority
   - Accepted paid bookings get top priority (0)
   - Pending bookings at current stop get next priority (1)
   - Future stops: accepted -> 2, pending -> 3
   ---------------------- */
function buildPriorityQueue(bookings: Booking[], currentStopId: string | null) {
  return [...bookings]
    .map((b) => {
      const base = b.status === "Accepted" ? 0 : 1; // accepted -> 0, pending -> 1
      const notAtCurrent = currentStopId && b.pickupId !== currentStopId;
      const priority = base + (notAtCurrent ? 2 : 0); // +2 if not at current stop
      return { booking: b, priority };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      // tiebreaker: earlier scheduled time, then earlier createdAt
      return (a.booking.scheduledAtMs ?? 0) - (b.booking.scheduledAtMs ?? 0) || (a.booking.createdAt ?? 0) - (b.booking.createdAt ?? 0);
    })
    .map((p) => p.booking);
}

/* ----------------------
   Main component
   ---------------------- */

export default function HomeScreen() {
  /* --- UI & selection state --- */
  const [pickup_idx, set_pickup] = useState<number>(-1);
  const [dropoff_idx, set_dropoff] = useState<number>(-1);
  const [riders, set_riders] = useState<number>(1);
  const [time_idx, set_time] = useState<number>(-1);
  const [etaToPickup, setEtaToPickup] = useState<number | null>(null);


  const [stops, setStops] = useState<Stop[]>([]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);

  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [helpStepIndex, setHelpStepIndex] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { guestId: ctxGuestId, loading: guestLoading } = useGuest();

  /* --- bookings + user/session state --- */
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [isGuest, setIsGuest] = useState(!auth.currentUser);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  /* --- shuttle tracking state --- */
  const [shuttleMarker, setShuttleMarker] = useState(
  new AnimatedRegion({
      latitude: 33.74,
      longitude: -84.39,
    })
);

const [shuttleHeading, setShuttleHeading] = useState(0);

const [shuttleReady, setShuttleReady] = useState(false);

const shuttleOpacity = useRef(new Animated.Value(0)).current;


  /* --- shuttle state / simulator --- */
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0); // index in sortedStops
  const [shuttleRunning, setShuttleRunning] = useState(false);
  const shuttleTimerRef = useRef<any>(null);

  /* --- refs, navigation, insets --- */
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const labels = useMemo(() => stops.map((s) => s.title), [stops]);

  const direction: Direction | null =
    pickup_idx >= 0 &&
    dropoff_idx >= 0 &&
    stops[pickup_idx] &&
    stops[dropoff_idx]
      ? getDirection(stops[pickup_idx].id, stops[dropoff_idx].id)
      : null;

  const timeOptions = direction ? TIME_SLOTS_BY_DIR[direction] : [];

  const canContinue = pickup_idx >= 0 && dropoff_idx >= 0 && time_idx >= 0 && !submitting;

  /* --------------------
     Load stops once
     -------------------- */
  useEffect(() => {
    let cancelled = false;
    async function loadStops() {
      try {
        const snap = await getDocs(collection(db, "stops"));
        const loaded: Stop[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            title: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            order: data.order ?? 0,
          };
        });
        loaded.sort((a, b) => a.order - b.order);
        if (!cancelled) setStops(loaded);
      } catch (err) {
        console.error("Failed to load stops:", err);
        Alert.alert("Error", "Failed to load shuttle stops. Please try again.");
      }
    }
    loadStops();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------
     Fit map to stops when available
     -------------------- */
  useEffect(() => {
    if (mapRef.current && stops.length > 0) {
      mapRef.current.fitToCoordinates(
        stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
        { edgePadding: { top: 120, right: 120, bottom: 120, left: 120 }, animated: true }
      );
    }
  }, [stops]);

  /* -------------------------------
   Live Shuttle Firestore Listener
  --------------------------------- */
  useEffect(() => {
  const unsub = subscribeToShuttleLocation((loc) => {

    // ⭐ DRIVER STOPPED SHARING
    if (!loc) {
      setShuttleReady(false);
      setEtaToPickup(null);

      Animated.timing(shuttleOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();

      return;
    }

    const newCoordinate = {
      latitude: loc.lat,
      longitude: loc.lng,
    };

    // First valid shuttle update → fade in
    if (!shuttleReady) {
      setShuttleReady(true);

      Animated.timing(shuttleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }

    // Update heading
    if (typeof loc.heading === "number" && !isNaN(loc.heading)) {
      setShuttleHeading(loc.heading);
    }

    // Move smoothly
    (shuttleMarker as any).timing({
      latitude: newCoordinate.latitude,
      longitude: newCoordinate.longitude,
      duration: 900,
      useNativeDriver: false,
    }).start();

    // ETA update
    if (pickup_idx >= 0 && stops[pickup_idx]) {
      const pickup = stops[pickup_idx];
      const d = distanceMeters(
        newCoordinate.latitude,
        newCoordinate.longitude,
        pickup.latitude,
        pickup.longitude
      );
      setEtaToPickup(estimateETA(d));
    }
  });

  return () => unsub();
}, [pickup_idx, stops]);




  /* --------------------
     Auth state
     -------------------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUid(u?.uid ?? null);
      setIsGuest(!u);
    });
    return unsub;
  }, []);

  /* --------------------
     Listen to bookings (real-time)
     - keeps allBookings in sync with firestore
     -------------------- */
  useEffect(() => {
    const bookingsRef = collection(db, "booking");
    const q = query(bookingsRef /* add filters if desired (e.g., today's bookings) */);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Booking[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            firestoreId: d.id,
            id: data.id ?? `${d.id}`,
            code: data.code ?? "",
            pickupId: data.pickupId ?? "",
            pickupName: data.pickupName ?? "",
            dropoffId: data.dropoffId ?? "",
            dropoffName: data.dropoffName ?? "",
            riders: data.riders ?? 1,
            status: data.status ?? "Pending",
            createdAt: data.localCreatedAt ?? Date.now(),
            slotLabel: data.slotLabel ?? "",
            scheduledAtMs: data.scheduledAtMs ?? (data.scheduledAt ? (data.scheduledAt as any).toMillis?.() ?? Date.now() : Date.now()),
            direction: (data.direction as Direction) ?? "northbound",
            pickupIndex: idxOf(data.pickupId ?? ""),
            dropoffIndex: idxOf(data.dropoffId ?? ""),
            segments: (data.segments as string[]) ?? segmentsBetween(data.pickupId ?? "", data.dropoffId ?? ""),
            amount: data.amount ?? 0,
            userId: data.userId ?? null,
            guestId: data.guestId ?? null,
            rating: data.rating ?? null,
            reviewText: data.reviewText ?? null,
            reviewedAt: data.reviewedAt ? (data.reviewedAt as any).toMillis?.() : null,
          } as Booking;
        });
        setAllBookings(arr);
      },
      (err) => console.error("Booking snapshot error:", err)
    );
    return () => unsub();
  }, []);

  /* --------------------
     Keep lastBooking in sync with allBookings (same behavior you had)
     -------------------- */
  useEffect(() => {
    if (allBookings.length === 0) {
      setLastBooking(null);
      setBooking(null);
      return;
    }
    const sorted = [...allBookings].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const latest = sorted[0];
    setLastBooking(latest);
    setBooking(latest);
  }, [allBookings]);

  /* --------------------
     Show review modal after ride completes
     -------------------- */
  useEffect(() => {
    if (booking && booking.status === "Completed" && !booking.reviewedAt) {
      setShowReviewModal(true);
    }
  }, [booking]);

  /* --------------------
     Recompute seatsLeft when selection changes
     -------------------- */
  useEffect(() => {
    (async () => {
      if (
        pickup_idx < 0 ||
        dropoff_idx < 0 ||
        time_idx < 0 ||
        !stops[pickup_idx] ||
        !stops[dropoff_idx]
      ) {
        setSeatsLeft(null);
        return;
      }
      const pickup = stops[pickup_idx];
      const dropoff = stops[dropoff_idx];
      const dir = getDirection(pickup.id, dropoff.id);
      const slotLabel = TIME_SLOTS_BY_DIR[dir][time_idx];
      const scheduledAt = slotToDate(slotLabel);
      const { remaining } = await computeRemainingSeats(dir, scheduledAt.getTime(), pickup.id, dropoff.id);
      setSeatsLeft(remaining);
      set_riders((r) => Math.min(Math.max(1, r), Math.max(1, remaining)));
    })();
  }, [pickup_idx, dropoff_idx, time_idx, stops]);

  /* --------------------
     Local storage helpers
     -------------------- */
  async function saveLastBookingToLocal(b: Booking, userId?: string, guestId?: string) {
    let key = "lastBooking";
    if (userId) key = `lastBooking_user_${userId}`;
    else if (guestId) key = `lastBooking_guest_${guestId}`;
    await AsyncStorage.setItem(key, JSON.stringify(b));
  }
  async function loadLastBookingFromLocal(userId?: string, guestId?: string) {
    let key = "lastBooking";
    if (userId) key = `lastBooking_user_${userId}`;
    else if (guestId) key = `lastBooking_guest_${guestId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Booking) : null;
  }
  async function clearLastBookingLocal(userId?: string, guestId?: string) {
    try {
      if (userId) await AsyncStorage.removeItem(`lastBooking_user_${userId}`);
      if (guestId) await AsyncStorage.removeItem(`lastBooking_guest_${guestId}`);
      await AsyncStorage.removeItem("lastBooking");
    } catch (err) {
      console.warn("clearLastBookingLocal failed:", err);
    }
  }

  /* --------------------
     Firestore helpers (save/cancel/update)
     -------------------- */
  async function saveBookingToFirestore(bookingData: Partial<Booking>) {
    const user = auth.currentUser;
    const bookingRef = collection(db, "booking");
    const docRef = await addDoc(bookingRef, {
      code: bookingData.code ?? "",
      pickupId: bookingData.pickupId ?? "",
      pickupName: bookingData.pickupName ?? "",
      dropoffId: bookingData.dropoffId ?? "",
      dropoffName: bookingData.dropoffName ?? "",
      riders: bookingData.riders ?? 1,
      status: bookingData.status ?? "Pending",
      createdAt: serverTimestamp(),
      localCreatedAt: bookingData.createdAt ?? Date.now(),
      direction: bookingData.direction ?? "northbound",
      slotLabel: bookingData.slotLabel ?? "",
      scheduledAt: bookingData.scheduledAtMs ? Timestamp.fromMillis(bookingData.scheduledAtMs) : null,
      scheduledAtMs: bookingData.scheduledAtMs ?? null,
      segments: bookingData.segments ?? [],
      userId: user ? user.uid : bookingData.userId ?? "",
      guestId: user ? null : bookingData.guestId ?? null,
      rating: bookingData.rating ?? null,
      reviewText: bookingData.reviewText ?? null,
      reviewedAt: bookingData.reviewedAt ?? null,
      amount: bookingData.amount ?? 0,
    });
    return docRef;
  }

  async function cancelBookingInFirestore(firestoreId: string) {
    const payload = { status: "Cancelled", cancelledAt: serverTimestamp() };
    const rootRef = doc(db, "booking", firestoreId);
    await updateDoc(rootRef, payload);
    console.log("🟢 Cancelled root booking:", firestoreId);

    // update owner subcollection if exists
    let owner = auth.currentUser?.uid ?? null;
    if (!owner) {
      const snap = await getDoc(rootRef);
      const data = snap.data();
      owner = data?.guestId ?? null;
    }
    if (owner) {
      const userRef = doc(db, "userInfo", owner, "booking", firestoreId);
      try {
        await updateDoc(userRef, payload);
        console.log("🟢 Cancelled userInfo booking for:", owner);
      } catch (e) {
        // if update fails, attempt set
        try {
          await setDoc(userRef, payload, { merge: true });
        } catch (err) {
          console.warn("Failed to update/set userInfo booking:", err);
        }
      }
    } else {
      console.warn("⚠️ No user or guest found — subcollection not updated");
    }
  }

  async function updateBookingStatusInFirestore(firestoreId: string, status: Booking["status"], userId?: string | null, guestId?: string | null) {
    const rootRef = doc(db, "booking", firestoreId);
    const payload: any = { status, updatedAt: serverTimestamp() };
    if (status === "Accepted") payload.confirmedAt = serverTimestamp();
    if (status === "Cancelled") payload.cancelledAt = serverTimestamp();
    if (status === "Completed") payload.completedAt = serverTimestamp();

    await updateDoc(rootRef, payload);

    if (userId) {
      const userRef = doc(db, "userInfo", userId, "booking", firestoreId);
      try {
        await updateDoc(userRef, payload);
      } catch (e) {
        await setDoc(userRef, { ...payload, bookingId: firestoreId }, { merge: true });
      }
    }
  }

  /* --------------------
     Remaining seats computation
     - considers Pending & Accepted in same slot/day & direction
     -------------------- */
  async function computeRemainingSeats(
    dir: Direction,
    scheduledAtMs: number,
    pickupId: string,
    dropoffId: string
  ): Promise<{ remaining: number; bySegment: Record<string, number> }> {
    const { start, end } = dayBoundsFor(scheduledAtMs);
    const segsNeeded = segmentsBetween(pickupId, dropoffId);
    if (segsNeeded.length === 0) return { remaining: BUSCAPACITY, bySegment: {} };

    const q = query(
      collection(db, "booking"),
      where("direction", "==", dir),
      where("status", "in", ["Pending", "Accepted"]),
      where("scheduledAtMs", ">=", start),
      where("scheduledAtMs", "<", end)
    );

    const snap = await getDocs(q);

    const load: Record<string, number> = {};
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as any;
      const otherSegs: string[] = (data.segments as string[]) ?? segmentsBetween(data.pickupId as string, data.dropoffId as string);
      const ridersCount: number = (data.riders as number) ?? 1;
      for (const s of otherSegs) {
        if (segsNeeded.includes(s)) {
          load[s] = (load[s] || 0) + ridersCount;
        }
      }
    }

    let worst = 0;
    for (const s of segsNeeded) {
      worst = Math.max(worst, load[s] || 0);
    }
    const remaining = Math.max(0, BUSCAPACITY - worst);
    return { remaining, bySegment: load };
  }

  /* --------------------
     Booking flows (continue -> payment -> save)
     -------------------- */
  async function handleContinue() {
    if (!canContinue) {
      Alert.alert("Missing info", "Please select pickup, drop-off and time.");
      return;
    }

    setSubmitting(true);
    const pickup = stops[pickup_idx];
    const dropoff = stops[dropoff_idx];
    if (!pickup || !dropoff) {
      Alert.alert("Stops not loaded", "Please wait for stops to load and try again.");
      setSubmitting(false);
      return;
    }

    const amount = 100 * riders;
    const userId: string | null = auth.currentUser?.uid ?? null;
    const guestId: string | null = userId ? null : `guest-${Math.random().toString(36).slice(2, 7)}`;

    // create payment intent on your backend (same as your original flow)
    let clientSecret: string;
    try {
      const resp = await fetch("https://unindividuated-predisastrously-dayna.ngrok-free.dev/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount * riders, userId: userId ?? guestId }),
      });
      if (!resp.ok) throw new Error("Payment Intent failed");
      const j = await resp.json();
      clientSecret = j.clientSecret;
      if (!clientSecret) throw new Error("Missing clientSecret");
    } catch (err) {
      console.error("Payment Intent Error:", err);
      Alert.alert("Payment Error", "Unable to start payment.");
      setSubmitting(false);
      return;
    }

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: "Peoplestown Shuttle Service",
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: true,
      returnURL: "peoplestown://home",
    });

    if (initError) {
      console.error("INIT PAYMENT SHEET ERROR:", initError);
      Alert.alert("Payment Error", "Unable to initialize payment.");
      setSubmitting(false);
      return;
    }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      console.log("Payment cancelled or failed:", presentError);
      Alert.alert("Payment Cancelled", "You were not charged.");
      setSubmitting(false);
      return;
    }

    // Payment succeeded -> create booking (Pending)
    const code = makeCode();
    const slotLabel = timeOptions[time_idx];
    const scheduledAt = slotToDate(slotLabel);

    const b: Booking = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      code,
      pickupId: pickup.id,
      pickupName: pickup.title,
      dropoffId: dropoff.id,
      dropoffName: dropoff.title,
      riders,
      status: "Pending",
      createdAt: Date.now(),
      direction: getDirection(pickup.id, dropoff.id),
      slotLabel,
      scheduledAtMs: scheduledAt.getTime(),
      pickupIndex: idxOf(pickup.id),
      dropoffIndex: idxOf(dropoff.id),
      segments: segmentsBetween(pickup.id, dropoff.id),
      amount,
      ...(userId && { userId }),
      ...(guestId && { guestId }),
    };

    try {
      const docRef = await saveBookingToFirestore({
        code: b.code,
        pickupId: b.pickupId,
        pickupName: b.pickupName,
        dropoffId: b.dropoffId,
        dropoffName: b.dropoffName,
        riders: b.riders,
        status: b.status,
        createdAt: b.createdAt,
        direction: b.direction,
        slotLabel: b.slotLabel,
        scheduledAtMs: b.scheduledAtMs,
        segments: b.segments,
        userId: b.userId,
        guestId: b.guestId,
        amount: b.amount,
      });
      b.firestoreId = docRef.id;

      if (userId) {
        const userDocRef = doc(db, "userInfo", userId);
        await setDoc(userDocRef, { createdAt: serverTimestamp() }, { merge: true });

        const userBookingRef = doc(db, "userInfo", userId, "booking", docRef.id);
        await setDoc(
          userBookingRef,
          {
            bookingId: docRef.id,
            pickupName: b.pickupName,
            dropoffName: b.dropoffName,
            status: b.status,
            code: b.code,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await saveLastBookingToLocal(b, userId ?? undefined, guestId ?? undefined);
      setBooking({ ...b });
      setShowBookingModal(true);
    } catch (e) {
      console.error("Booking save error:", e);
      Alert.alert("Error", "Payment succeeded but booking could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  /* --------------------
     Confirm payment flow (used by pay modal)
     -------------------- */
  async function handleConfirmPaymentFlow() {
  setLoading(true);

  try {
    // 1️⃣ Show Stripe payment sheet
    const { error: paymentError } = await presentPaymentSheet();
    if (paymentError) {
      Alert.alert("Payment Failed", paymentError.message);
      return;
    }

    // 2️⃣ Booking must exist
    if (!booking) return;

    // 3️⃣ Determine user / guest identity
    const userId = auth.currentUser?.uid ?? null;
    const guestId = userId ? null : booking.guestId ?? null;

    // 4️⃣ Update local booking state
    const updatedBooking: Booking = {
      ...booking,
      status: "Pending",
      userId,
      guestId,
    };

    setBooking(updatedBooking);

    await saveLastBookingToLocal(
      updatedBooking,
      userId ?? undefined,
      guestId ?? undefined
    );

    // 5️⃣ Update Firestore booking → status: Pending
    if (updatedBooking.firestoreId) {
      try {
        await updateBookingStatusInFirestore(
          updatedBooking.firestoreId,
          "Pending",
          userId,
          guestId
        );
      } catch (err) {
        console.warn("Failed to update booking status:", err);
      }
    }

    // 6️⃣ Log ride and update payment defaults (only for signed-in users)
    if (userId) {
      // Log ride creation
      await addDoc(collection(db, "ride_logs"), {
        direction: updatedBooking.direction,
        pickupName: updatedBooking.pickupName,
        dropoffName: updatedBooking.dropoffName,
        numPassengers: updatedBooking.riders,
        userId,
        timeBooked: serverTimestamp(),
      });

      // Save default payment if missing
      if (updatedBooking.paymentId) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        const hasDefaultPayment = userSnap.exists() && userSnap.data()?.defaultPayment;

        if (!hasDefaultPayment) {
          await setDoc(
            userRef,
            {
              defaultPayment: updatedBooking.paymentId,
              paymentEnabled: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    }

    // 7️⃣ Close sheet & confirm
    setPayOpen(false);
    Alert.alert("Payment confirmed");

  } catch (err) {
    console.error("Payment flow error:", err);
    Alert.alert("Error", "Payment flow error occurred.");
  } finally {
    setLoading(false);
  }
}


  /* --------------------
     Review submit/skip
     -------------------- */
  async function handleSubmitReview(rating: number, text: string) {
  if (!booking || !booking.firestoreId) {
    setShowReviewModal(false);
    return;
  }

  setReviewSubmitting(true);

  try {
    const userId = auth.currentUser?.uid ?? null;
    const reviewedAtMs = Date.now();

    // Update local state
    const updated: Booking = {
      ...booking,
      rating,
      reviewText: text || null,
      reviewedAt: reviewedAtMs,
    };

    setBooking(updated);

    // Keep local storage logic
    await saveLastBookingToLocal(
      updated,
      userId ?? undefined,
      updated.guestId ?? undefined
    );

    // 1. UPDATE BOOKING DOCUMENT
    const bookingRef = doc(db, "booking", booking.firestoreId);
    await updateDoc(bookingRef, {
      rating,
      reviewText: text || null,
      reviewedAt: Timestamp.fromMillis(reviewedAtMs),
    });

    // 2. SAVE TO REVIEWS COLLECTION (EXACT FIELD MATCH)
    const reviewsRef = collection(db, "reviews");
    await addDoc(reviewsRef, {
      bookingId: booking.firestoreId,
      firstName: booking.firstName ?? "",
      lastName: booking.lastName ?? "",
      pickup: booking.pickup ?? "",
      dropoff: booking.dropoff ?? "",
      rating,
      reviewText: text || "",
      reviewedAt: Timestamp.fromMillis(reviewedAtMs),
    });

    // 3. (Optional) UPDATE USER’S BOOKING HISTORY
    if (userId) {
      const userBookingRef = doc(
        db,
        "userInfo",
        userId,
        "booking",
        booking.firestoreId
      );
      await setDoc(
        userBookingRef,
        {
          rating,
          reviewText: text || null,
          reviewedAt: Timestamp.fromMillis(reviewedAtMs),
        },
        { merge: true }
      );
    }

    setShowReviewModal(false);
  } catch (err) {
    console.error("Review submit error:", err);
    Alert.alert("Error", "Could not save your review. Please try again.");
  } finally {
    setReviewSubmitting(false);
  }
}

function handleSkipReview() {
  setShowReviewModal(false);
}


  /* --------------------
     Shuttle arrival processing
     - processArrivingStop: when the shuttle arrives at a stop, accept as many bookings as capacity allows
     - Prioritization:
         1) Accepted bookings already (status=Accepted) are considered onboard or reserved
         2) Pending bookings at current stop prioritized over pending bookings at future stops
     - This function updates Firestore to set booking status -> Accepted (boarding / confirmed)
     -------------------- */
  async function processArrivingStop(stop: Stop) {
    try {
      // identify bookings for this scheduled day/time and direction that are Pending or Accepted
      // to keep this general, we will look at bookings scheduled same day (you can narrow by slotLabel)
      const nowMs = Date.now();
      // For demo, we consider same day bookings
      const { start, end } = dayBoundsFor(nowMs);

      // load all Pending/Accepted bookings for this day & direction
      const q = query(
        collection(db, "booking"),
        where("scheduledAtMs", ">=", start),
        where("scheduledAtMs", "<", end),
        where("status", "in", ["Pending", "Accepted"])
      );
      const snap = await getDocs(q);
      const bookingsToday: Booking[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          firestoreId: d.id,
          id: data.id ?? d.id,
          pickupId: data.pickupId,
          dropoffId: data.dropoffId,
          riders: data.riders ?? 1,
          status: data.status,
          scheduledAtMs: data.scheduledAtMs ?? (data.scheduledAt ? (data.scheduledAt as any).toMillis?.() : Date.now()),
          pickupIndex: idxOf(data.pickupId),
          dropoffIndex: idxOf(data.dropoffId),
          segments: (data.segments as string[]) ?? segmentsBetween(data.pickupId, data.dropoffId),
          userId: data.userId ?? null,
          guestId: data.guestId ?? null,
        } as Booking;
      });

      // Build priority queue relative to this stop
      const queue = buildPriorityQueue(
        bookingsToday.filter((b) => typeof b.pickupId === "string"),
        stop.id
      );

      // Calculate current load on segments (accounting Accepted bookings)
      const segLoad: Record<string, number> = {};
      for (const b of queue) {
        if (b.status === "Accepted") {
          const segs = b.segments ?? segmentsBetween(b.pickupId, b.dropoffId);
          for (const s of segs) segLoad[s] = (segLoad[s] || 0) + (b.riders ?? 1);
        }
      }

      // Now iterate the priority queue and accept pending bookings for this pickup stop as capacity allows
      for (const b of queue) {
        if (b.status !== "Pending") continue; // skip already accepted
        if (b.pickupId !== stop.id) continue; // only boarding at this stop

        const segs = b.segments ?? segmentsBetween(b.pickupId, b.dropoffId);
        let blocked = false;
        for (const s of segs) {
          const loadOnSeg = segLoad[s] || 0;
          if (loadOnSeg + (b.riders ?? 1) > BUSCAPACITY) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          // not enough seats for this booking
          console.log("Not enough seats for booking", b.firestoreId);
          continue;
        }
        // Accept this booking: update segLoad and write to Firestore
        for (const s of segs) segLoad[s] = (segLoad[s] || 0) + (b.riders ?? 1);

        if (b.firestoreId) {
          try {
            await updateBookingStatusInFirestore(b.firestoreId, "Accepted", b.userId ?? null, b.guestId ?? null);
            console.log("Booking accepted at stop:", b.firestoreId);
          } catch (err) {
            console.warn("Failed to mark booking Accepted:", b.firestoreId, err);
          }
        }
      }
    } catch (err) {
      console.error("processArrivingStop error:", err);
    }
  }

  /* --------------------
     Shuttle simulator
     - startShuttleSimulation will advance stops every N seconds for testing
     - In production you would feed currentStopIndex from real driver telemetry
     -------------------- */
  function startShuttleSimulation(intervalMs = 15_000) {
    if (shuttleTimerRef.current) return;
    setShuttleRunning(true);
    shuttleTimerRef.current = setInterval(async () => {
      setCurrentStopIndex((prev) => {
        const next = (prev + 1) % Math.max(1, sortedStops.length || 1);
        const stop = sortedStops[next];
        // process arriving stop async (fire-and-forget)
        if (stop) processArrivingStop(stop);
        return next;
      });
    }, intervalMs);
  }
  function stopShuttleSimulation() {
    if (shuttleTimerRef.current) {
      clearInterval(shuttleTimerRef.current);
      shuttleTimerRef.current = null;
      setShuttleRunning(false);
    }
  }
  useEffect(() => {
    // cleanup simulator on unmount
    return () => stopShuttleSimulation();
  }, []);

  /* --------------------
     Utility: getDirection, slotToDate
     -------------------- */
  function getDirection(pickupId: string, dropoffId: string): Direction {
    const p = ROUTE_ORDER.indexOf(pickupId);
    const d = ROUTE_ORDER.indexOf(dropoffId);
    if (p === -1 || d === -1) return "northbound";
    return d > p ? "northbound" : "southbound";
  }

  function slotToDate(slotLabel: string): Date {
    const [time, ampm] = slotLabel.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }

  // Haversine formula to compute distance in meters
  function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // meters
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Convert distance → ETA (min) assuming ~25 mph = 11 m/s
  function estimateETA(distanceMeters: number) {
    const SPEED_MPS = 11; // tweak if needed
    const seconds = distanceMeters / SPEED_MPS;
    return Math.round(seconds / 60); // minutes
  }


  /* --------------------
     Process UI booking done/cancel flows
     -------------------- */
  async function handleDoneAfterTimer() {
    if (!booking) return;
    const userId = auth.currentUser?.uid ?? null;
    const guestId = userId ? null : booking.guestId ?? null;
    const updated: Booking = { ...booking, status: "Accepted" };
    setBooking({ ...updated });
    await saveLastBookingToLocal(updated, userId ?? undefined, guestId ?? undefined);
    if (updated.firestoreId) {
      try {
        await updateBookingStatusInFirestore(updated.firestoreId, "Accepted", userId, guestId);
      } catch (e) {
        console.warn("Failed to update booking->Accepted:", e);
      }
    }
    setShowBookingModal(false);
  }

  async function handleCancelBooking(incoming?: Booking) {
    const current = incoming ?? booking;
    if (!current) return;
    const updated: Booking = { ...current, status: "Cancelled" };
    setBooking({ ...updated });
    const userId = auth.currentUser?.uid ?? null;
    const guestId = userId ? null : current.guestId ?? null;
    await saveLastBookingToLocal(updated, userId ?? undefined, guestId ?? undefined);
    if (updated.firestoreId) {
      try {
        await cancelBookingInFirestore(updated.firestoreId);
      } catch (e) {
        console.warn("Failed to cancel booking in Firestore:", e);
      }
    }
    setShowBookingModal(false);
  }

  /* --------------------
     Phone-agent / inbound call integration placeholder
     - NOTE: this is scaffolding only. You'll implement server-side webhooks to create bookings via phone.
     -------------------- */
  async function handleIncomingPhoneBooking(payload: { from: string; pickupId: string; dropoffId: string; timeLabel?: string; riders?: number; guestId?: string }) {
    // Example: create a pending booking on behalf of phone caller
    try {
      const pickup = stops.find((s) => s.id === payload.pickupId);
      const dropoff = stops.find((s) => s.id === payload.dropoffId);
      if (!pickup || !dropoff) {
        console.warn("Phone booking: invalid stop ids", payload);
        return;
      }
      const slotLabel = payload.timeLabel ?? TIME_SLOTS_BY_DIR["northbound"][0];
      const scheduledAt = slotToDate(slotLabel);
      const b: Booking = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code: makeCode(),
        pickupId: pickup.id,
        pickupName: pickup.title,
        dropoffId: dropoff.id,
        dropoffName: dropoff.title,
        riders: payload.riders ?? 1,
        status: "Pending",
        createdAt: Date.now(),
        direction: getDirection(pickup.id, dropoff.id),
        slotLabel,
        scheduledAtMs: scheduledAt.getTime(),
        pickupIndex: idxOf(pickup.id),
        dropoffIndex: idxOf(dropoff.id),
        segments: segmentsBetween(pickup.id, dropoff.id),
        amount: 100 * (payload.riders ?? 1),
        guestId: payload.guestId ?? null,
      };
      const docRef = await saveBookingToFirestore({ ...b });
      b.firestoreId = docRef.id;
      console.log("Phone booking created:", docRef.id);
      // optionally notify operator/UI
    } catch (err) {
      console.error("handleIncomingPhoneBooking error:", err);
    }
  }

  /* --------------------
     Derived values
     -------------------- */
  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => a.order - b.order);
  }, [stops]);

  const currentStop = sortedStops[currentStopIndex] ?? null;

  /* --------------------
     Render UI
     -------------------- */
  const currentHelpStep = HELP_STEPS[helpStepIndex];
  const isFirstHelpStep = helpStepIndex === 0;
  const isLastHelpStep = helpStepIndex === HELP_STEPS.length - 1;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {Platform.OS === "web" ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#111827" }}>Open on a device to see the map</Text>
        </View>
      ) : (
        <MapView
          ref={(r) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ latitude: 33.74, longitude: -84.39, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        >
          {sortedStops.map((s, index) => {
            const isPickup = index === pickup_idx;
            const isDropoff = index === dropoff_idx;
            const isCurrent = index === currentStopIndex;

            const pinColor = isCurrent
              ? "#10B981"
              : isPickup || isDropoff
              ? "#003cefff"
              : "#b6adadff";

            return (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                title={s.title}
                pinColor={pinColor}
                tracksViewChanges={false}
                onPress={() => {
                  mapRef.current?.animateCamera(
                    { center: { latitude: s.latitude, longitude: s.longitude }, zoom: 16 },
                    { duration: 500 }
                  );
                }}
              />
            );
          })}

          {/* UBER-STYLE ANIMATED SHUTTLE CAR */}
          {shuttleReady && (
            <MarkerAnimated
              coordinate={shuttleMarker}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Animated.View style={{ opacity: shuttleOpacity }}>
                <Image
                  source={require("../../assets/images/car.png")}
                  style={{
                    width: 40,
                    height: 40,
                    resizeMode: "contain",
                    transform: [{ rotate: `${shuttleHeading}deg` }],
                  }}
                />
              </Animated.View>
            </MarkerAnimated>
          )}



        </MapView>

      )}

      {/* ⭐ ETA TO PICKUP UI ⭐ */}
      {etaToPickup !== null && pickup_idx >= 0 && (
        <View
          style={{
            position: "absolute",
            top: 100,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              Shuttle ETA to pickup: {etaToPickup} min
            </Text>
          </View>
        </View>
      )}

      {/* Top-left menu button */}
      <LinearGradient colors={["#10833aff", "#1d703cff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: insets.top + 12, left: 16, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" }}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} activeOpacity={0.8} style={{ justifyContent: "center", alignItems: "center", width: 70, height: 60, borderRadius: 30 }}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Top-right help button */}
      <LinearGradient colors={["#f6c604ff", "#be9d18ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: insets.top + 12, right: 16, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { setHelpStepIndex(0); setShowHelp(true); }} activeOpacity={0.8} style={{ justifyContent: "center", alignItems: "center", width: 60, height: 60, borderRadius: 30 }}>
          <Ionicons name="help-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Booking sheet (floating) */}
      {!showHelp && (
        <BookingSheet
          lastBooking={lastBooking}
          pickup_idx={pickup_idx}
          dropoff_idx={dropoff_idx}
          labels={labels}
          stops={stops}
          direction={direction}
          time_idx={time_idx}
          timeOptions={timeOptions}
          riders={riders}
          set_riders={set_riders}
          seatsLeft={seatsLeft}
          canContinue={canContinue}
          loading={loading}
          submitting={submitting}
          handleContinue={handleContinue}
          set_pickup={set_pickup}
          set_dropoff={set_dropoff}
          set_time={set_time}
          mapRef={mapRef}
          BUSCAPACITY={BUSCAPACITY}
        />
      )}

      <RideReviewModal visible={showReviewModal} onSubmit={handleSubmitReview} onSkip={handleSkipReview} />

      {/* Payment modal */}
      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={() => setPayOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }} onPress={() => setPayOpen(false)} />
        <View style={[styles.sheetModal, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.grabber} />
          {booking ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "700" }}>PAYMENT</Text>
              <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: "700" }}>Ride Details</Text>
              <Text>From: {booking.pickupName}</Text>
              <Text>To: {booking.dropoffName}</Text>
              <Text>Riders: {booking.riders}</Text>
              <Text>Time: {booking.slotLabel}</Text>
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Status: {booking.status}</Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
                <TouchableOpacity
                  onPress={async () => {
                    if (booking.firestoreId) await cancelBookingInFirestore(booking.firestoreId);
                    await clearLastBookingLocal(auth.currentUser?.uid ?? undefined, booking?.guestId ?? undefined);
                    setPayOpen(false);
                    setBooking(null);
                    Alert.alert("Booking Cancelled");
                  }}
                  style={{ flex: 1, backgroundColor: "#DC2626", borderRadius: 8, paddingVertical: 12, marginRight: 8, alignItems: "center" }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmPaymentFlow} disabled={loading} style={{ flex: 1, backgroundColor: "#16A34A", borderRadius: 8, paddingVertical: 12, marginLeft: 8, alignItems: "center", opacity: loading ? 0.7 : 1 }}>
                  <Text style={{ color: "white", fontWeight: "700" }}>{loading ? "Processing…" : "Confirm"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ textAlign: "center", padding: 16 }}>No booking found.</Text>
          )}
        </View>
      </Modal>

      {/* Booking confirmation + floating car button */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <BookingConfirmationModal visible={showBookingModal} booking={booking} onDone={handleDoneAfterTimer} onCancel={handleCancelBooking} />

        {booking && booking.status === "Accepted" && (
          <LinearGradient colors={["#0e50caff", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", right: 16, top: 120, borderRadius: 30, padding: 12, width: 60, height: 60, justifyContent: "center", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setShowBookingModal(true)} activeOpacity={0.9} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", borderRadius: 30 }}>
              <Ionicons name="car-sport" size={28} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>

      {/* Shuttle controls (DEV / Test)
      <View style={{ position: "absolute", left: 16, bottom: insets.bottom + 16, flexDirection: "row", gap: 8 }}>
        <TouchableOpacity onPress={() => { startShuttleSimulation(10_000); }} style={{ backgroundColor: "#111827", padding: 10, borderRadius: 8 }}>
          <Text style={{ color: "white" }}>Start Shuttle (sim)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => stopShuttleSimulation()} style={{ backgroundColor: "#6B7280", padding: 10, borderRadius: 8 }}>
          <Text style={{ color: "white" }}>Stop Shuttle</Text>
        </TouchableOpacity>
      </View>*/}

      {/* Help overlay */}
      {showHelp && (
        <View style={styles.helpOverlay}>
          <View style={styles.helpBackdrop} />
          <View style={[styles.helpCard, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.helpHeaderRow}>
              <Text style={styles.helpTitle}>{currentHelpStep.title}</Text>
              <Text style={styles.helpStepCount}>Step {helpStepIndex + 1} of {HELP_STEPS.length}</Text>
            </View>

            <Text style={styles.helpDescription}>{currentHelpStep.description}</Text>

            <View style={styles.helpDotsRow}>
              {HELP_STEPS.map((_, i) => (
                <View key={i} style={[styles.helpDot, i === helpStepIndex && styles.helpDotActive]} />
              ))}
            </View>

            <View style={styles.helpButtonsRow}>
              <TouchableOpacity onPress={() => !isFirstHelpStep && setHelpStepIndex((p) => p - 1)} disabled={isFirstHelpStep}>
                <Text style={[styles.helpBackText, isFirstHelpStep && { opacity: 0.4 }]}>← Back</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={() => setShowHelp(false)} style={styles.helpSecondaryButton}><Text style={styles.helpSecondaryText}>Close</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => (isLastHelpStep ? setShowHelp(false) : setHelpStepIndex((p) => p + 1))} style={styles.helpPrimaryButton}><Text style={styles.helpPrimaryText}>{isLastHelpStep ? "Got it" : "Next →"}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
