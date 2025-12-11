import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../constants/theme";
import { auth, db } from "../../firebaseConfig";

const DEFAULT_AVATAR = require("@/assets/images/ios-light.png");



export default function RegisterScreen() {
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [confirmPassword, setConfirmPassword] = React.useState<string>("");
  const [passwordIsVisible, setPasswordIsVisible] = React.useState<boolean>(false);
  const [confirmPasswordIsVisible, setConfirmPasswordIsVisible] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const router = useRouter();


      const handleGuest = async () => {
        try {
            //guest context handles guest creation and firestore 
          router.push("/(tabs)/home");
        } catch (error) {
          console.error("Error continuing as guest:", error);
        }
    };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (auth.currentUser) {
        await signOut(auth);
      }

      const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = cred.user;

      await sendEmailVerification(user);
      Alert.alert(
        "Verify your email",
        "A verification link has been sent to your email address. Please verify before logging in."
      );

      await setDoc(doc(db, "userInfo", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        avatar: DEFAULT_AVATAR,
        createdAt: new Date(),
        role: "user",
        //Stripe fields for user
        connectedStripeId: "",
        stripeUserId: "",
        stripeEnrolled: false,
        paymentEnabled: false,
      });

      Alert.alert("Success", "Account created successfully!");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      let message = error.message || "Registration failed";
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "This email is already registered";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        case "auth/weak-password":
          message = "Password is too weak";
          break;
        case "auth/operation-not-allowed":
          message = "You did not verify your email. Please try again."
      }
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { alignItems: "center", width: "100%" }]}>
          <Text style={styles.title}>Register</Text>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="user" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              onChangeText={setFirstName}
              value={firstName}
              autoCapitalize="words"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="user" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              onChangeText={setLastName}
              value={lastName}
              autoCapitalize="words"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="phone" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              onChangeText={setPhone}
              value={phone}
              keyboardType="phone-pad"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="mail" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry={!passwordIsVisible}
              onChangeText={setPassword}
              value={password}
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
            <TouchableOpacity
              style={styles.passwordVisibleButton}
              onPress={() => setPasswordIsVisible(!passwordIsVisible)}
            >
              <Text style={{ color: "#7C808D" }}>{passwordIsVisible ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry={!confirmPasswordIsVisible}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
            <TouchableOpacity
              style={styles.passwordVisibleButton}
              onPress={() => setConfirmPasswordIsVisible(!confirmPasswordIsVisible)}
            >
              <Text style={{ color: "#7C808D" }}>
                {confirmPasswordIsVisible ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Creating Account..." : "Register"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/login")}
            style={styles.registerButton}
          >
            <Text style={styles.registerButtonText}>
              Already have an account?{" "}
              <Text style={styles.registerButtonHighlight}>Login Now!</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGuest}
            style={styles.registerButton}
          >
            <Text style={[styles.registerButtonText, {textAlign: "center"}]}>
              Don't want an account?{" "}
              <Text style={styles.registerButtonHighlight}>Continue as Guest!</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
