import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

import { collection, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function VerifyScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  const handlePasswordReset = async () => {
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, "userInfo"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "Email not found in our system.");
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset Email Sent",
        "Check your inbox and follow the link to reset your password.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/login"), // redirect to login
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
      </View>
      <Text style={styles.title}>Forgot Your Password?</Text>
      <Text style={styles.subtitle}>
        Enter your registered email, and we’ll send you a link to reset it.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#7C808D"
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handlePasswordReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 30,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#000",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#3662AA",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: "black",
  },
});
