import { useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "firebaseConfig";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

const API_URL = "https://unindividuated-predisastrously-dayna.ngrok-free.dev";

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const auth = getAuth();

  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [accountInfo, setAccountInfo] = useState<string | null>(null);

  const initRef = useRef(false);

  const fetchPaymentSheetParams = async (userId: string) => {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, userId }),
    });

    const { clientSecret } = await response.json();
    return { clientSecret };
  };

  const initializePaymentSheet = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userSnap = await getDoc(doc(db, "userInfo", user.uid));
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    setAccountInfo(userData.stripeUserId || "Not connected");

    const { clientSecret } = await fetchPaymentSheetParams(user.uid);
    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: "Peoplestown Shuttle App",
      allowsDelayedPaymentMethods: true,
      returnURL: "peoplestown://home",
    });

    if (!error) setLoading(true);
  };

  const saveBooking = async () => {
    const user = auth.currentUser;
    const bookingData: Record<string, any> = {
      status: "Pending",
      paymentStatus: "paid",
      amount: 100,
      createdAt: serverTimestamp(),
    };

    if (user) bookingData.userId = user.uid;
    else bookingData.guestId = "guest_" + Date.now().toString();

    await addDoc(collection(db, "booking"), bookingData);
  };

  const openPaymentSheet = async () => {
    if (processingPayment) return;
    setProcessingPayment(true);

    const { error } = await presentPaymentSheet();

    if (!error) {
      await saveBooking();
      router.replace("/home");
    }

    setProcessingPayment(false);
  };

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initializePaymentSheet();
    }
  }, []);

  if (!accountInfo) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ marginBottom: 10 }}>
        Connected Account: {accountInfo}
      </Text>

      <Button
        title={processingPayment ? "Processing..." : "Checkout"}
        onPress={openPaymentSheet}
        disabled={!loading || processingPayment}
      />
    </View>
  );
}
