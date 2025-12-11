import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "firebaseConfig";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "https://parentlike-mireille-subtympanitic.ngrok-free.dev";

type PaymentMethod = {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
};

export default function SavedPayments() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const auth = getAuth();
  const [stripeUserId, setStripeUserId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStripeUserId = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    const userRef = doc(db, "userInfo", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      Alert.alert("Error", "User info not found in Firestore.");
      return;
    }

    const data = userSnap.data();
    setStripeUserId(data.stripeUserId || null);
  };

  const fetchPaymentMethods = async (customerId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/list-payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      if (!res.ok) Alert.alert("You have no saved payment methods.");

      const data: PaymentMethod[] = await res.json();
      setPaymentMethods(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    try {
      const res = await fetch(`${API_URL}/detach-payment-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!res.ok) throw new Error("Failed to remove card");

      Alert.alert("Success", "Card removed");
      if (stripeUserId) fetchPaymentMethods(stripeUserId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", message);
    }
  };

  const addNewCard = async () => {
  const user = auth.currentUser;
  if (!user) {
    Alert.alert("Error", "You must be logged in.");
    return;
  }

  try {
    let currentStripeId = stripeUserId;

    if (!currentStripeId) {
      const userRef = doc(db, "userInfo", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        currentStripeId = data.stripeUserId || null;
      }
    }

    const response = await fetch(`${API_URL}/create-setup-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, customerId: currentStripeId }),
    });

    const { clientSecret } = await response.json();

    if (!clientSecret) {
      Alert.alert("Error", "No client secret returned from server.");
      return;
    }

    const init = await initPaymentSheet({
      customerId: currentStripeId || undefined,
      setupIntentClientSecret: clientSecret,
      merchantDisplayName: "ParentLike",
    });

    if (init.error) throw new Error(init.error.message);

    const present = await presentPaymentSheet();
    if (present.error) throw new Error(present.error.message);

    Alert.alert("Success", "Card added successfully!");
    if (currentStripeId) fetchPaymentMethods(currentStripeId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert("Error", message);
  }
};


  useEffect(() => {
    fetchStripeUserId();
  }, []);

  useEffect(() => {
    if (stripeUserId) fetchPaymentMethods(stripeUserId);
  }, [stripeUserId]);

  const renderItem = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.card}>
      <Text style={styles.text}>
        {item.card.brand.toUpperCase()} •••• {item.card.last4}
      </Text>
      <Text style={styles.text}>
        Expires {item.card.exp_month}/{item.card.exp_year}
      </Text>
      <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeButton}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

return (
  <View style={{flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 10,backgroundColor: "#fff"}}>
    <View style={{marginTop: 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,}}>
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
                      paddingTop: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 4,
                      top: 50
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
    </View>

    <View style={styles.content}>
      <Text style={styles.title}>Saved Payment Methods</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={paymentMethods}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={[styles.emptyText, {marginTop: 10}]}>No saved cards found</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>

    <TouchableOpacity onPress={addNewCard} style={styles.addButton}>
      <Text style={styles.addButtonText}>➕ Add New Card</Text>
    </TouchableOpacity>
  </View>
)
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 80,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
  },
  card: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  removeButton: {
    marginTop: 8,
  },
  removeText: {
    color: "#c00",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#f6c604ff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
    width: "90%",
    marginBottom: 70,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 6,
    color: "white",
  },
});

