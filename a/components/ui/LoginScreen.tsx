import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../constants/theme";
import { auth, db } from "../../firebaseConfig";

// Array of driver email addresses
const DRIVER_EMAILS = [
  "driver@gmail.com",
  "driver1@peoplestown.com",
  "driver2@peoplestown.com",
  // Add more driver emails as needed
];

// array of admin email addresses
const ADMIN_EMAILS = [
  "admin@gmail.com",
  "admin@peoplestown.com"
  // Add more admin emails here
];

const DEFAULT_AVATAR = require('@/assets/images/ios-light.png');

export default function LoginScreen() {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [passwordIsVisible, setPasswordIsVisible] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please fill in all fields");
    return;
  }

  setLoading(true);

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    const ref = doc(db, "userInfo", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      Alert.alert("Profile Missing", "We couldn't find your profile. Please register.");
      router.replace("/(tabs)/register");
      return;
    }

    const userData = snap.data();
    const userRole = userData?.role;
    const userEmail = user.email?.toLowerCase() || "";

    // ----- DRIVER -----
    if (userRole === "driver" || DRIVER_EMAILS.includes(userEmail)) {
      router.replace("/(tabs)/driver-dashboard");
      return;
    }

    // ----- ADMIN -----
    if (userRole === "admin" && ADMIN_EMAILS.includes(userEmail)) {
      router.replace("/(tabs)/admin-dashboard");
      return;
    }

    // ----- NORMAL USER -----
    router.replace("/(tabs)/home");

  } catch (error: any) {
    let message = error.message || "Login failed";

    switch (error.code) {
      case "auth/invalid-email":
      case "auth/user-not-found":
      case "auth/wrong-password":
        message = "Incorrect username or password";
        break;
      case "auth/user-disabled":
        message = "This account has been disabled";
        break;
    }

    Alert.alert("Login Failed", message);
  } finally {
    setLoading(false);
  }
};


const handleGuest = async () => {
  try {
//guest context handles guest creation and firestore 
    router.push("/(tabs)/home");
  } catch (error) {
    console.error("Error continuing as guest:", error);
  }
};





  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} keyboardShouldPersistTaps="handled">
        <View style={[styles.content, { alignItems: "center", width: "100%" }]}>
          <Text style={styles.title}>Login</Text>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="mail" size={22} color="#7C808D" />
            </View>
            <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} value={email} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#7C808D" selectionColor="#3662AA" />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput style={styles.input} placeholder="Enter password" secureTextEntry={!passwordIsVisible} onChangeText={setPassword} value={password} autoCapitalize="none" placeholderTextColor="#7C808D" selectionColor="#3662AA" />
            <TouchableOpacity style={styles.passwordVisibleButton} onPress={() => setPasswordIsVisible(!passwordIsVisible)}>
              <Text style={{ color: "#7C808D" }}>{passwordIsVisible ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginButtonText}>{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.loginButton, { backgroundColor: "#ccc", marginTop: 12 , width: "70%"}]} onPress={handleGuest} disabled={loading}>
            <Text style={[styles.loginButtonText, { color: "#000" }]}>Continue as Guest</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(tabs)/register")} style={[styles.registerButton, {marginTop: 30}]}>
            <Text style={styles.registerButtonText}>New to Peoplestown? <Text style={styles.registerButtonHighlight}>Register Now!</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/ProfileViews/verify")} style={styles.registerButton}>
            <Text style={styles.registerButtonText}>Forgot Password? <Text style={styles.registerButtonHighlight}>Change Here</Text></Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}