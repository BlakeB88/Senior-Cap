// app/services/bookings.js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // two dots up; exact casing of the file



export default async function createBooking(data) {
  if (!db) throw new Error("Firestore 'db' is undefined. Check firebaseConfig export and this import path.");
  try {
    const docRef = await addDoc(collection(db, "booking"), {
      ...data,
      status: "requested",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    // rethrow with explicit code so the UI can show it
    const code = e?.code || e?.name || "unknown";
    const msg = e?.message || String(e);
    throw new Error(`createBooking failed [${code}]: ${msg}`);
  }
}
