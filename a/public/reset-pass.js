import { initializeApp } from "firebase/app";
import { confirmPasswordReset, getAuth } from "firebase/auth";

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
const auth = getAuth(app);

// Parse URL
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get("oobCode");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submit");

submitBtn.addEventListener("click", async () => {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "Passwords do not match!";
    return;
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    messageEl.textContent = "Password updated successfully!";
  } catch (error) {
    messageEl.textContent = "Error: " + error.message;
  }
});
