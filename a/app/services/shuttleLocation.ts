// app/services/shuttleLocation.ts
import * as Location from "expo-location";
import {
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

export const SHUTTLE_DOC_ID = "activeShuttle";

export type ShuttleLocation = {
  lat: number;
  lng: number;
  heading?: number | null;
  updatedAt: number;
  driverId: string;
};

/**
 * Request foreground location permission.
 * Throws if permission is not granted.
 */
export async function ensureLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission not granted");
  }
}

/**
 * Start broadcasting the driver's current location to Firestore.
 * Returns a cleanup function that stops broadcasting.
 *
 * Assumes a **single driver** so we always write into:
 *   shuttleLocation/activeShuttle
 */
export function startShuttleBroadcast(
  onError?: (err: unknown) => void
): () => void {
  let subscription: Location.LocationSubscription | null = null;
  let isStopped = false;

  const user = auth.currentUser;
  const driverId = user?.uid ?? "unknown-driver";

  const start = async () => {
    try {
      await ensureLocationPermission();

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // every 5 seconds
          distanceInterval: 10, // or when moved 10m
        },
        async (loc) => {
          if (isStopped) return;
          const { latitude, longitude, heading } = loc.coords;

          try {
            await setDoc(
              doc(db, "shuttleLocation", SHUTTLE_DOC_ID),
              {
                lat: latitude,
                lng: longitude,
                heading: heading ?? null,
                driverId,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (e) {
            console.error("Failed to write shuttle location:", e);
          }
        }
      );
    } catch (err) {
      console.error("startShuttleBroadcast error:", err);
      if (onError) onError(err);
    }
  };

  // fire and forget
  void start();

  // cleanup
  return () => {
    isStopped = true;
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  };
}

/**
 * Subscribe to shuttle position in Firestore.
 * The callback will receive `null` if the document does not exist.
 */
export function subscribeToShuttleLocation(
  cb: (loc: ShuttleLocation | null) => void
): () => void {
  const ref = doc(db, "shuttleLocation", SHUTTLE_DOC_ID);

  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const data = snap.data() as any;
      cb({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading ?? null,
        updatedAt:
          typeof data.updatedAt?.toMillis === "function"
            ? data.updatedAt.toMillis()
            : Date.now(),
        driverId: data.driverId ?? "",
      });
    },
    (err) => {
      console.error("subscribeToShuttleLocation error:", err);
      cb(null);
    }
  );

  return unsub;
}