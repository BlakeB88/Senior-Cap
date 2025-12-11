import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState<boolean>(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("Error", "No user is currently signed in");
      return;
    }

    setLoading(true);

    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert(
        "Success",
        "Your password has been changed successfully",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      let message = error.message || "Failed to change password";
      
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          message = "Current password is incorrect";
          break;
        case "auth/weak-password":
          message = "New password is too weak";
          break;
        case "auth/requires-recent-login":
          message = "Please log out and log in again before changing your password";
          break;
        case "auth/user-mismatch":
        case "auth/user-not-found":
          message = "User authentication error. Please log in again";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        case "auth/too-many-requests":
          message = "Too many attempts. Please try again later";
          break;
      }

      Alert.alert("Password Change Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            Enter your current password and choose a new one
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              secureTextEntry={!currentPasswordVisible}
              onChangeText={setCurrentPassword}
              value={currentPassword}
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
            <TouchableOpacity
              style={styles.passwordVisibleButton}
              onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}
            >
              <Text style={{ color: "#7C808D" }}>
                {currentPasswordVisible ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="New password"
              secureTextEntry={!newPasswordVisible}
              onChangeText={setNewPassword}
              value={newPassword}
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
            <TouchableOpacity
              style={styles.passwordVisibleButton}
              onPress={() => setNewPasswordVisible(!newPasswordVisible)}
            >
              <Text style={{ color: "#7C808D" }}>
                {newPasswordVisible ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputContainer}>
            <View style={styles.icon}>
              <Feather name="lock" size={22} color="#7C808D" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              secureTextEntry={!confirmPasswordVisible}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              autoCapitalize="none"
              placeholderTextColor="#7C808D"
              selectionColor="#3662AA"
            />
            <TouchableOpacity
              style={styles.passwordVisibleButton}
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            >
              <Text style={{ color: "#7C808D" }}>
                {confirmPasswordVisible ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={styles.changePasswordButtonText}>
              {loading ? "Changing Password..." : "Change Password"}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • Password must be at least 6 characters long
            </Text>
            <Text style={styles.infoText}>
              • New password must be different from current password
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  content: {
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#7C808D",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8F9",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  passwordVisibleButton: {
    padding: 8,
  },
  changePasswordButton: {
    backgroundColor: "#3662AA",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  changePasswordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#F7F8F9",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#7C808D",
    marginBottom: 4,
  },
});