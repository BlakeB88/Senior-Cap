// ProfileScreen.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, TouchableRipple } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../firebaseConfig";

type bookingStatus = "Pending" | "Accepted" | "Completed" | "Cancelled";
type Booking = {
  id?: string;
  firestoreId?: string;
  code?: string;
  pickupId?: string;
  pickupName?: string;
  dropoffId?: string;
  dropoffName?: string;
  riders?: number;
  status?: bookingStatus;
  createdAt?: number;
  slotLabel?: string;
  scheduledAtMs?: number;
  direction?: "northbound" | "southbound";
  userId?: string;
  pickupIndex?: number;
  dropoffIndex?: number;
  segments?: string[];
};

type HelpStep = {
  title: string;
  description: string;
};

const LOGGED_IN_STEPS: HelpStep[] = [
  { title: "View your profile", description: "This screen shows your photo, name, username, phone, and email." },
  { title: "Edit profile", description: "Tap “Edit Profile” to update your name, photo, phone number, or email." },
  { title: "Change your password", description: "Tap “Change Password” to securely update your password for the app." },
  { title: "Log out", description: "Tap “Log Out” when you’re finished using the Peoplestown Shuttle app." },
];

const GUEST_STEPS: HelpStep[] = [
  { title: "You’re using Guest mode", description: "As a guest you can explore the app and book rides without creating an account." },
  { title: "Why create an account?", description: "When you register, we can save your ride history, contact info, and make booking faster next time." },
  { title: "Log in", description: "If you already have an account, tap “Log In” to sign in with your email and password." },
  { title: "Register", description: "Tap “Register” to create a new Peoplestown Shuttle account with your name, email, and password." },
];

const DEFAULT_AVATAR = require("../../assets/images/ios-light.png") as number;

/**
 * ProfileScreen
 * - Shows guest or signed-in user
 * - Subscribes to "Accepted" bookings for the right user path
 * - Falls back to AsyncStorage cached accepted booking when snapshot is empty/offline
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  // profile fields
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | number>(DEFAULT_AVATAR);

  // UI state
  const [loadingSnapshot, setLoadingSnapshot] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(!auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [rideCount, setRideCount] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  // booking + help
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpStepIndex, setHelpStepIndex] = useState(0);

  const steps = isGuest ? GUEST_STEPS : LOGGED_IN_STEPS;
  const currentStep = steps[helpStepIndex];
  const isFirstStep = helpStepIndex === 0;
  const isLastStep = helpStepIndex === steps.length - 1;

  // format booking time
  const formatBookingTime = (b?: Booking) => {
    if (!b) return "Scheduled";
    if (b.slotLabel) return b.slotLabel;
    if (b.scheduledAtMs) {
      return new Date(b.scheduledAtMs).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return "Scheduled";
  };

  useEffect(() => {
  let unsub: (() => void) | null = null;
  let mounted = true;

  const fetchBooking = async () => {
    setLoadingSnapshot(true);
    const user = auth.currentUser;

    let ref;
    let storageKey = "";

    if (user) {
      // Signed-in user: userInfo/{uid}/booking
      ref = collection(db, "userInfo", user.uid, "booking");
      storageKey = `acceptedBooking_${user.uid}`;
    } else {
      // Guest: root booking collection
      const guestId = await AsyncStorage.getItem("guestId");
      ref = collection(db, "booking");
      storageKey = "acceptedBooking_guest";

      if (guestId) {
        ref = query(ref, where("guestId", "==", guestId), where("status", "==", "Accepted"));
      } else {
        // fallback: no guestId
        const raw = await AsyncStorage.getItem(storageKey);
        setLastBooking(raw ? JSON.parse(raw) : null);
        setLoadingSnapshot(false);
        return;
      }
    }

    // If we haven't queried yet (signed-in user)
    if (!("query" in ref)) {
      ref = query(ref, where("status", "==", "Accepted"));
    }

    unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!mounted) return;

        if (snap.empty) {
          const raw = await AsyncStorage.getItem(storageKey);
          setLastBooking(raw ? JSON.parse(raw) : null);
          setLoadingSnapshot(false);
          return;
        }

        const docs = snap.docs.map((d) => ({ ...(d.data() as any), firestoreId: d.id })) as Booking[];
        const sorted = docs.sort((a, b) => (b.scheduledAtMs || 0) - (a.scheduledAtMs || 0));
        setLastBooking(sorted[0] || null);
        await AsyncStorage.setItem(storageKey, JSON.stringify(sorted[0] || null));
        setLoadingSnapshot(false);
      },
      () => setLoadingSnapshot(false)
    );
  };

  fetchBooking();

  return () => {
    mounted = false;
    if (unsub) unsub();
  };
}, [uid]);



  // watch auth state to toggle between guest & signed-in UI
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setIsGuest(!user);
      setEmail(user?.email ?? null);

      if (!user) {
        // fallback defaults for guest
        setFirstName("");
        setLastName("");
        setPhone("");
        setAvatar(DEFAULT_AVATAR);
        setRideCount(0);
      }
    });
    return unsub;
  }, []);

  // load profile doc when signed in
  useEffect(() => {
    if (!uid) return;
    setLoadingSnapshot(true);
    const ref = doc(db, "userInfo", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setFirstName("");
          setLastName("");
          setPhone("");
          setAvatar(DEFAULT_AVATAR);
        } else {
          const d = snap.data() as any;
          setFirstName(d.firstName ?? "");
          setLastName(d.lastName ?? "");
          setPhone(d.phone ?? "");
          setAvatar(!d.avatar || d.avatar === "default" ? DEFAULT_AVATAR : (d.avatar as string));
        }
        setLoadingSnapshot(false);
      },
      (err) => {
        console.warn("userInfo snapshot error:", err);
        setLoadingSnapshot(false);
      }
    );
    return unsub;
  }, [uid]);

  // ride count (Completed)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setRideCount(0);
        return;
      }
      try {
        const userBookingsRef = collection(db, "userInfo", u.uid, "booking");
        const q = query(userBookingsRef, where("status", "==", "Completed"));
        const snap = await getCountFromServer(q);
        setRideCount(snap.data().count);
      } catch (e) {
        console.warn("ride count error", e);
        setRideCount(0);
      }
    });
    return () => unsub();
  }, []);

  // pick image (update profile)
  const pickImage = async () => {
    if (isGuest) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const ref = doc(db, "userInfo", uid);
          await updateDoc(ref, { avatar: uri });
        }
      } catch (e) {
        Alert.alert("Error", "Could not update avatar");
      }
    }
  };

  // logout
  const doLogOut = async () => {
    try {
      await signOut(auth);
      router.replace("../login");
    } catch (e) {
      Alert.alert("Logout failed", String(e));
    }
  };
  const handleLogOut = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: doLogOut },
    ]);
  };

  // save profile
  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please log in to update your profile.");
      return;
    }
    const uid = user.uid;
    const ref = doc(db, "userInfo", uid);
    const payload = {
      firstName: firstName?.trim() || "",
      lastName: lastName?.trim() || "",
      phone: phone?.trim() || "",
      email: user.email ?? null,
      updatedAt: serverTimestamp(),
    };
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, payload);
      }
      setIsEditing(false);
      Alert.alert("Saved", "Your profile was updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not save your profile.");
    }
  };

  // UI helpers for help modal
  const openHelp = () => {
    setHelpStepIndex(0);
    setShowHelp(true);
  };
  const closeHelp = () => setShowHelp(false);
  const goNext = () => (isLastStep ? closeHelp() : setHelpStepIndex((p) => p + 1));
  const goBack = () => (!isFirstStep ? setHelpStepIndex((p) => p - 1) : null);

  if (loadingSnapshot) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 18, color: "#0f766e", fontWeight: "600" }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Render
  return (
  <>
    {isGuest ? (
      /* --------------------- GUEST VIEW --------------------- */
      <SafeAreaView style={styles.container}>

        {/* HEADER */}
        <View
          style={{
            marginTop: 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          {/* BACK BUTTON */}
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={["#14b861ff", "#3bbc4eff"]}
              start={[0, 0]}
              end={[1, 1]}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 24,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text
                style={{
                  color: "white",
                  marginLeft: 6,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                Back
              </Text>
            </LinearGradient>
          </Pressable>

          {/* HELP BUTTON */}
          <TouchableOpacity onPress={openHelp}>
            <LinearGradient
              colors={["#ffda48ff", "#be9d18ff"]}
              start={[0, 0]}
              end={[1, 1]}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                top: 5,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 5,
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={28}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* PROFILE SECTION */}
        <View style={[styles.userInfoSection, { marginTop: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar.Image
              size={88}
              source={typeof avatar === "string" ? { uri: avatar } : avatar}
            />
            <View style={{ marginLeft: 18 }}>
              <Text style={[styles.title, { fontSize: 22 }]}>
                {firstName || "Guest"}
              </Text>
              <Text style={styles.caption}>You’re not signed in</Text>
            </View>
          </View>

          {/* UPCOMING RIDE */}
          {lastBooking?.status === "Accepted" ? (
            <View style={[styles.upcomingRideCard, { marginTop: 10 }]}>
              <Text style={styles.upcomingTitle}>Upcoming Ride</Text>

              <View style={styles.upcomingRow}>
                <Text style={styles.upcomingLabel}>Confirmation</Text>
                <Text style={styles.upcomingValue}>
                  {lastBooking.code ?? "-"}
                </Text>
              </View>

              <View style={styles.upcomingRow}>
                <Text style={styles.upcomingLabel}>Time</Text>
                <Text style={styles.upcomingValue}>
                  {formatBookingTime(lastBooking)}
                </Text>
              </View>

              <View style={styles.upcomingRow}>
                <Text style={styles.upcomingLabel}>Riders</Text>
                <Text style={styles.upcomingValue}>
                  {lastBooking.riders ?? "-"}
                </Text>
              </View>

              <View style={styles.upcomingRow}>
                <Text style={styles.upcomingLabel}>Pickup</Text>
                <Text style={styles.upcomingValue}>
                  {lastBooking.pickupName ?? "-"}
                </Text>
              </View>

              <View style={styles.upcomingRow}>
                <Text style={styles.upcomingLabel}>Dropoff</Text>
                <Text style={styles.upcomingValue}>
                  {lastBooking.dropoffName ?? "-"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={{ color: "#0f766e", fontWeight: "500" }}>
                No upcoming rides
              </Text>
            </View>
          )}

          {/* ACTIONS */}
          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 18, backgroundColor: "#14b861ff" },
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 12, backgroundColor: "#3662AA" },
            ]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* HELP OVERLAY */}
        {showHelp && (
          <View style={styles.helpOverlay}>
            <View style={styles.helpBackdrop} />
            <View
              style={[styles.helpCard, { paddingBottom: insets.bottom + 12 }]}
            >
              <View style={styles.helpHeaderRow}>
                <Text style={styles.helpTitle}>{currentStep.title}</Text>
                <Text style={styles.helpStepCount}>
                  Step {helpStepIndex + 1} of {GUEST_STEPS.length}
                </Text>
              </View>

              <Text style={styles.helpDescription}>
                {currentStep.description}
              </Text>

              <View style={styles.helpDotsRow}>
                {GUEST_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.helpDot,
                      i === helpStepIndex && styles.helpDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.helpButtonsRow}>
                <TouchableOpacity onPress={goBack} disabled={isFirstStep}>
                  <Text
                    style={[
                      styles.helpBackText,
                      isFirstStep && { opacity: 0.4 },
                    ]}
                  >
                    ← Back
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={closeHelp}
                    style={styles.helpSecondaryButton}
                  >
                    <Text style={styles.helpSecondaryText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={goNext}
                    style={styles.helpPrimaryButton}
                  >
                    <Text style={styles.helpPrimaryText}>
                      {isLastStep ? "Got it" : "Next →"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    ) : (
      /* ------------------ SIGNED-IN VIEW ------------------ */
      <SafeAreaView style={styles.container}>

        {/* HEADER */}
        <View
          style={{
            marginTop: 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={["#14b861ff", "#3bbc4eff"]}
              start={[0, 0]}
              end={[1, 1]}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 24,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text
                style={{
                  color: "white",
                  marginLeft: 10,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                Back
              </Text>
            </LinearGradient>
          </Pressable>

          <TouchableOpacity onPress={openHelp}>
            <LinearGradient
              colors={["#ffda48ff", "#be9d18ff"]}
              start={[0, 0]}
              end={[1, 1]}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                top: 5,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 5,
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={28}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* PROFILE */}
        <View style={[styles.userInfoSection, { marginTop: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableRipple onPress={!isGuest ? pickImage : undefined}>
              <Avatar.Image
                size={88}
                source={typeof avatar === "string" ? { uri: avatar } : avatar}
              />
            </TouchableRipple>

            <View style={{ marginLeft: 18, flex: 1 }}>
              {isEditing ? (
                <>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    style={{
                      borderBottomWidth: 1,
                      paddingVertical: 6,
                      marginBottom: 6,
                    }}
                  />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    style={{ borderBottomWidth: 1, paddingVertical: 6 }}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.title, { fontSize: 22 }]}>
                    {firstName} {lastName}
                  </Text>
                  <Text style={styles.caption}>
                    @{(firstName || "user").toLowerCase()}_
                    {(lastName || "profile").toLowerCase()}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* CONTACT */}
          <View style={{ marginTop: 14 }}>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="phone"
                color="#777777"
                size={20}
              />
              {isEditing ? (
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  style={{
                    borderBottomWidth: 1,
                    paddingVertical: 6,
                    marginLeft: 20,
                    flex: 1,
                  }}
                />
              ) : (
                <Text style={{ color: "#777777", marginLeft: 20 }}>
                  {phone || "N/A"}
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <MaterialCommunityIcons
                name="email"
                color="#777"
                size={20}
              />
              <Text style={{ color: "#777", marginLeft: 20 }}>
                {auth.currentUser?.email ?? "N/A"}
              </Text>
            </View>

            {/* UPCOMING RIDE */}
            {lastBooking?.status === "Accepted" ? (
              <View style={[styles.upcomingRideCard, { marginTop: 12 }]}>
                <Text style={styles.upcomingTitle}>Upcoming Ride</Text>

                <View style={styles.upcomingRow}>
                  <Text style={styles.upcomingLabel}>Confirmation</Text>
                  <Text style={styles.upcomingValue}>
                    {lastBooking.code ?? "-"}
                  </Text>
                </View>

                <View style={styles.upcomingRow}>
                  <Text style={styles.upcomingLabel}>Time</Text>
                  <Text style={styles.upcomingValue}>
                    {formatBookingTime(lastBooking)}
                  </Text>
                </View>

                <View style={styles.upcomingRow}>
                  <Text style={styles.upcomingLabel}>Riders</Text>
                  <Text style={styles.upcomingValue}>
                    {lastBooking.riders ?? "-"}
                  </Text>
                </View>

                <View style={styles.upcomingRow}>
                  <Text style={styles.upcomingLabel}>Pickup</Text>
                  <Text style={styles.upcomingValue}>
                    {lastBooking.pickupName ?? "-"}
                  </Text>
                </View>

                <View style={styles.upcomingRow}>
                  <Text style={styles.upcomingLabel}>Dropoff</Text>
                  <Text style={styles.upcomingValue}>
                    {lastBooking.dropoffName ?? "-"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={{ color: "#0f766e", fontWeight: "500" }}>
                  No upcoming rides
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* RIDE COUNT BOX */}
        <View style={[styles.rideBox, { marginTop: 16 }]}>
          <Text style={styles.rideLabel}>Rides Taken</Text>
          <Text style={styles.rideValue}>{rideCount ?? 0}</Text>
        </View>

        {/* ACTION BUTTONS */}
        {isEditing ? (
          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 16, backgroundColor: "#3ab814ff" },
            ]}
            onPress={saveProfile}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 16, backgroundColor: "#3bbc4eff" },
            ]}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { marginTop: 12, backgroundColor: "#3662AA" },
          ]}
          onPress={() => router.push("/ProfileViews/change-password")}
        >
          <Text style={[styles.buttonText, { color: "white" }]}>
            Change Password
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              marginTop: 12,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#e5e7eb",
            },
          ]}
          onPress={handleLogOut}
        >
          <Text style={[styles.buttonText, { color: "#ef4444" }]}>
            Log Out
          </Text>
        </TouchableOpacity>

        {/* HELP OVERLAY */}
        {showHelp && (
          <View style={styles.helpOverlay}>
            <View style={styles.helpBackdrop} />
            <View
              style={[styles.helpCard, { paddingBottom: insets.bottom + 12 }]}
            >
              <View style={styles.helpHeaderRow}>
                <Text style={styles.helpTitle}>{currentStep.title}</Text>
                <Text style={styles.helpStepCount}>
                  Step {helpStepIndex + 1} of {LOGGED_IN_STEPS.length}
                </Text>
              </View>

              <Text style={styles.helpDescription}>
                {currentStep.description}
              </Text>

              <View style={styles.helpDotsRow}>
                {LOGGED_IN_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.helpDot,
                      i === helpStepIndex && styles.helpDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.helpButtonsRow}>
                <TouchableOpacity onPress={goBack} disabled={isFirstStep}>
                  <Text
                    style={[
                      styles.helpBackText,
                      isFirstStep && { opacity: 0.4 },
                    ]}
                  >
                    ← Back
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={closeHelp}
                    style={styles.helpSecondaryButton}
                  >
                    <Text style={styles.helpSecondaryText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={goNext}
                    style={styles.helpPrimaryButton}
                  >
                    <Text style={styles.helpPrimaryText}>
                      {isLastStep ? "Got it" : "Next →"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    )}
  </>
);
}

// use the compact style object you provided and a couple lightweight overrides
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    backgroundColor: "#fff",
  },
  content: { paddingHorizontal: 30, flex: 1 },
  profileSection: { alignItems: "center", marginTop: 40 },
  userInfoSection: { paddingHorizontal: 30, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 5, color: "#000" },
  header: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  backButton: { flexDirection: "row", alignItems: "center" },
  backButtonText: { fontSize: 16, marginLeft: 5, color: "black" },
  caption: { fontSize: 16, color: "#7C808D", fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  rowText: { color: "#777777", fontSize: 16, marginLeft: 15 },
  infoBoxWrapper: { flexDirection: "row", justifyContent: "space-around", borderTopColor: "#eee", borderTopWidth: 1, borderBottomColor: "#eee", borderBottomWidth: 1, paddingVertical: 20, marginHorizontal: 20, borderRadius: 10, backgroundColor: "#f9f9f9", marginBottom: 10 },
  infoBox: { alignItems: "center" },
  infoNumber: { fontSize: 22, fontWeight: "bold", color: "#000" },
  infoLabel: { fontSize: 14, color: "#7C808D", marginTop: 4 },
  button: { padding: 14, borderRadius: 14, paddingHorizontal: 20, marginHorizontal: 20, marginVertical: 0, alignItems: "center" },
  buttonText: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' },
  logoutButton: { backgroundColor: "#3662AA", padding: 14, borderRadius: 10, marginTop: 30, marginHorizontal: 30 },
  logoutButtonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  navBtn: { position: 'absolute', left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  rideBox: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 15, paddingHorizontal: 25, alignItems: "center", justifyContent: "center", alignSelf: "center", alignContent: 'center' },
  rideLabel: { fontSize: 14, fontWeight: "600", color: "#111827", textAlign: 'center' },
  rideValue: { fontSize: 22, fontWeight: "700", color: "#777", marginTop: 4 },
  helpOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
 helpBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
 helpCard: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
 helpHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
 helpTitle: { fontWeight: "600", fontSize: 18 },
 helpStepCount: { fontSize: 14, color: "#777" },
 helpDescription: { fontSize: 16, color: "#444", marginBottom: 12 },
 helpDotsRow: { flexDirection: "row", marginBottom: 12 },
 helpDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ccc", marginHorizontal: 2 },
 helpDotActive: { backgroundColor: "#f6c604ff" },
 helpButtonsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
 helpBackText: { fontSize: 16, color: "#777" },
 helpPrimaryButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#14B8A6", borderRadius: 8, marginLeft: 8 },
 helpPrimaryText: { color: "#fff", fontWeight: "600" },
 helpSecondaryButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#E5E7EB", borderRadius: 8 },
 helpSecondaryText: { color: "#111", fontWeight: "600" },
  upcomingRideCard: { width: "100%", marginTop: 0, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: "#F3F4F6", marginBottom: 0, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: Platform.OS === "android" ? 3 : 0 },
  upcomingTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8 },
  upcomingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  upcomingLabel: { fontSize: 13, color: "#6B7280" },
  upcomingValue: { fontSize: 13, fontWeight: "500", color: "#111827", maxWidth: 200, textAlign: "right" },
});
