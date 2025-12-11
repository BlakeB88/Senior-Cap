import { useRouter } from 'expo-router';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from "../../firebaseConfig";

export default function SplashScreen() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const handleGuest = async () => {
    try {
  //guest context handles guest creation and firestore 
      router.push("/(tabs)/home");
    } catch (error) {
      console.error("Error continuing as guest:", error);
    }
  };

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      router.replace("/(tabs)/home");
      return;
    }

    try {
      // Load user role from Firestore
      const docRef = doc(db, "userInfo", user.uid);
      const snap = await getDoc(docRef);

      const role = snap.data()?.role ?? "user";

      if (role === "admin") {
        router.replace("../admin-dashboard");
      } else if (role === "driver") {
        router.replace("/driver-dashboard");
      } else {
        router.replace("/home");
      }

    } catch (err) {
      console.error("Role check error:", err);
      router.replace("/home"); // fallback if Firestore fails
    }
  });

  return () => unsubscribe();
}, []);

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/welcome-peoplestown.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
      <View style={styles.buttonContainer}>
        <Pressable style={styles.guestButton} onPress={handleGuest}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </Pressable>
        <Pressable style={styles.loginButton} onPress={() => router.push('/(tabs)/login')}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </Pressable>
        <Pressable style={{width: '100%', paddingVertical: 16, backgroundColor: "#faf065ff", borderRadius: 20,  alignItems: 'center',  }}
            onPress={() => router.push('/(tabs)/register')}>
          <Text style={[styles.loginButtonText, {color: "black"}]}>Make An Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 230,
    height: 200,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  guestButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#4b975aff',
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#3662AA',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
