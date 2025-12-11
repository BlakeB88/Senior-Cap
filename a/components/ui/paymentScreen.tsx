// app/screens/PaymentScreen.tsx
// Android emulator
// iOS simulator can hit http://localhost:4242; for a device, use your machine's LAN IP.
import { auth, db } from "@/firebaseConfig";
import {
  confirmPlatformPayPayment,
  initPaymentSheet,
  isPlatformPaySupported,
  PlatformPay,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import { doc, setDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Platform, Text, View } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:4242";

export default function PaymentScreen() {
  const [ready, setReady] = useState(false);
  const [supportsPlatformPay, setSupportsPlatformPay] = useState(false);
  const user = auth.currentUser;

  const fetchPaymentSheetParams = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/payment-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 100,
        currency: "usd",
        customer_id: null,
      }),
    });
    if (!res.ok) throw new Error("Failed to create PaymentIntent");
    return res.json();
  }, []);

  const initialize = useCallback(async () => {
    try {
      const {
        paymentIntent,
        ephemeralKey,
        customer,
        merchantDisplayName,
        allowsDelayedPaymentMethods,
      } = await fetchPaymentSheetParams();

      if (user && customer) {
        const userRef = doc(db, "userInfo", user.uid);
        await setDoc(userRef, { stripeUserId: customer }, { merge: true });
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: merchantDisplayName || "Peoplestown Revitalization",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: !!allowsDelayedPaymentMethods,
        defaultBillingDetails: { name: user?.displayName || "" },
        applePay: { merchantCountryCode: "US" },
        googlePay: { merchantCountryCode: "US", testEnv: true },
        style: "automatic",
        returnURL: "yourapp://payments",
      });

      if (!error) setReady(true);
    } catch (e: any) {
      Alert.alert("Init error", e?.message ?? String(e));
    }
  }, [fetchPaymentSheetParams, user]);

  useEffect(() => {
    initialize();
    (async () => {
      let supported = false;
      if (Platform.OS === "ios") {
        supported = await isPlatformPaySupported();
      } else if (Platform.OS === "android") {
        supported = await isPlatformPaySupported({ googlePay: { testEnv: true } });
      }
      setSupportsPlatformPay(!!supported);
    })();
  }, [initialize]);

  const openSheet = useCallback(async () => {
    const { error } = await presentPaymentSheet();
    if (error) {
      Alert.alert("Payment failed", `${error.code} • ${error.message}`);
    } else {
      Alert.alert("Success", "Your payment is confirmed!");
    }
  }, []);

  const payWithPlatformPay = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/create-intent-for-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1299, currency: "usd" }),
      });
      const clientSecretRes = await res.json();

      const { error } = await confirmPlatformPayPayment(
        clientSecretRes.paymentIntent,
        {
          applePay: {
            cartItems: [
              { label: "Shuttle Ride", amount: "1.00", paymentType: PlatformPay.PaymentType.Immediate },
            ],
            merchantCountryCode: "US",
            currencyCode: "USD",
          },
          googlePay: {
            amount: 1.0,
            currencyCode: "USD",
            merchantCountryCode: "US",
            testEnv: true,
          },
        }
      );

      if (error) {
        Alert.alert("Wallet payment failed", error.message);
      } else {
        Alert.alert("Success", "Wallet payment confirmed!");
      }
    } catch (e: any) {
      Alert.alert("Wallet error", e?.message ?? String(e));
    }
  }, []);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Complete payment</Text>

      {!ready ? (
        <View style={{ alignItems: "center" }}>
          <ActivityIndicator />
          <Text>Preparing secure checkout…</Text>
        </View>
      ) : (
        <>
          {supportsPlatformPay && (
            <Button
              title={Platform.OS === "ios" ? "Pay with Apple Pay" : "Pay with Google Pay"}
              onPress={payWithPlatformPay}
            />
          )}
          <Button title="Pay with other methods (Cash App Pay / Card)" onPress={openSheet} />
        </>
      )}
    </View>
  );
}
