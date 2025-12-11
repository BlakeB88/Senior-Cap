import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
   apiKey: "AIzaSyCQN1w-xJtfIhYwnjqFGXgrXxk938UYEBI",
  authDomain: "peoplestown-app.firebaseapp.com",
  projectId: "peoplestown-app",
  storageBucket: "peoplestown-app.appspot.com",
  messagingSenderId: "885013092493",
  appId: "1:885013092493:web:42ceb2e50f11e46de1eac4",
  measurementId: "G-MZ9R1ENBQ7"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db, firebaseConfig };

