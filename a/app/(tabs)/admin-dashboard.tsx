import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { useNavigation, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebaseConfig";


type RideLog = {
  id: string;
  pickupName?: string;   // <-- optional
  dropoffName?: string;  // <-- optional
  numPassengers?: number;
  review?: string;
  timeBooked?: { seconds: number; nanoseconds: number };
  [key: string]: any;
};



export default function AdminDashboard() {
  const [bookings, setBookings] = useState<RideLog[]>([]);
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
  async function load() {
    const q = query(collection(db, "ride_logs"), orderBy("timeBooked", "desc"));
    const snapshot = await getDocs(q);

    setBookings(
      snapshot.docs.map((doc) => {
        const data = doc.data() as Omit<RideLog, "id">; // Prevent overwrite
        return {
          id: doc.id,
          ...data,
        };
      })
    );
  }

  load();
}, []);

 const navigation = useNavigation();

  // -------------------------------
  // FILTERING LOGIC
  // -------------------------------
  const filteredBookings = bookings.filter((b) => {
    if (!b.timeBooked) return false;

    const timestamp = b.timeBooked.seconds * 1000;
    const date = new Date(timestamp);
    const now = new Date();

    if (filter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo;
    }

    if (filter === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });

  // -------------------------------
  // CSV EXPORT
  // -------------------------------
  async function downloadCSV() {
    if (filteredBookings.length === 0) return;

    let csv = "Date,Pickup,Dropoff,Passengers,Review\n";

    filteredBookings.forEach((b) => {
      const date = b.timeBooked
        ? new Date(b.timeBooked.seconds * 1000).toLocaleString()
        : "N/A";

      csv += `"${date}","${b.pickupName}","${b.dropoffName}","${b.numPassengers || ""}","${b.review || ""}"\n`;
    });

    const baseDir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? "";
    const fileUri = baseDir + "ride_history.csv";
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: "utf8" });
    await Sharing.shareAsync(fileUri);
  }

  // -------------------------------
  // PDF EXPORT
  // -------------------------------
  async function downloadPDF() {
    if (filteredBookings.length === 0) return;

    let html = `
      <html>
        <body>
          <h1>Ride Reports</h1>
    `;

    filteredBookings.forEach((b) => {
      const date = b.timeBooked
        ? new Date(b.timeBooked.seconds * 1000).toLocaleString()
        : "N/A";

      html += `
        <div style="margin-bottom:20px; padding:15px; border:1px solid #ccc;">
          <h3>${date}</h3>
          <p><strong>From:</strong> ${b.pickupName}</p>
          <p><strong>To:</strong> ${b.dropoffName}</p>
          <p><strong>Passengers:</strong> ${b.numPassengers || 1}</p>
          <p><strong>Review:</strong> ${b.review || "None"}</p>
        </div>
      `;
    });

    html += "</body></html>";

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <ScrollView
      showsVerticalScrollIndicator={true}
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* HEADER */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 80 }}>
        <Text style={styles.title}>Admin Dashboard</Text>
        {/* <TouchableOpacity onPress={() => router.replace("/login")}>
          <Ionicons name="log-out-outline" size={26} color="#333" />
        </TouchableOpacity> */}
      </View>

        <LinearGradient
          colors={["#10833aff", "#1d703cff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            activeOpacity={0.8}
            style={{
              justifyContent: "center",
              alignItems: "center",
              width: 60,
              height: 60,
              borderRadius: 30,
            }}
          >
            <Ionicons name="menu" size={26} color="#fff" />  
          </TouchableOpacity>
        </LinearGradient>
        <Text style={styles.subtitle}>Ride Reports</Text>

        {/* FILTER BUTTONS */}
        <View style={styles.filterRow}>
          {["all", "week", "month"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                filter === f && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === "all" ? "All" : f === "week" ? "This Week" : "This Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* EXPORT BUTTONS */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportButton} onPress={downloadCSV}>
            <Ionicons name="document-outline" size={18} color="#fff" />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportButton} onPress={downloadPDF}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.exportText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* RIDE LIST */}
        {filteredBookings.map((b) => {
          const date = b.timeBooked
            ? new Date(b.timeBooked.seconds * 1000).toLocaleString()
            : "Invalid Date";

          return (
            <View key={b.id} style={styles.card}>
              <Text style={styles.cardTitle}>{date}</Text>

              <Text style={styles.cardText}>
                <Text style={styles.bold}>From:</Text> {b.pickupName}
              </Text>

              <Text style={styles.cardText}>
                <Text style={styles.bold}>To:</Text> {b.dropoffName}
              </Text>

              <Text style={styles.cardText}>
                <Text style={styles.bold}>Review:</Text> {b.review || "None"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: "#65748B",
    marginBottom: 15,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#e4e7eb",
  },
  filterActive: {
    backgroundColor: "#2E5AAC",
  },
  filterText: {
    fontWeight: "600",
    color: "#333",
  },
  filterTextActive: {
    color: "#fff",
  },
  exportRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E5AAC",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  exportText: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#F3F5F9",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 3,
  },
  bold: {
    fontWeight: "700",
  },
});
