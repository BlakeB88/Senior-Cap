import { db } from "@/firebaseConfig";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Drawer } from "expo-router/drawer";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontSizeProvider } from "../../context/FontSizeContext";
import { GuestProvider } from "../../context/GuestUser";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<"admin" | "driver" | "user" | "guest">("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole("guest");
        setLoading(false);
        return;
      }

      const ref = doc(db, "userInfo", user.uid);
      const snap = await getDoc(ref);

      const r = snap.exists() ? snap.data().role : "guest";
      setRole(r ?? "guest");

      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey="pk_test_51SLLlwFgc03xaGHAITphti8SDzPvgZTKsDVXxJkUDNGJVUEgNjPxQS7DcyrZWU4vLGSLiZKvPU64bx8lTsEArdOO00oe1HV3nj"
      merchantIdentifier="merchant.com.peoplestown.app"
      urlScheme="peoplestown"
    >
      <GuestProvider>
        <FontSizeProvider>

          <Drawer
            screenOptions={{
              headerShown: false,
              drawerType: "front",
              drawerStyle: { width: 300 }
            }}
            drawerContent={(props) => (
              <DrawerContentScrollView {...props}>
                <SafeAreaView edges={["top"]} style={{ paddingTop: 6 }}>
                  <View style={{ flexDirection:"row", alignItems:"center", marginBottom: 20 }}>
                    <Image
                      source={require("@/assets/images/peoplestown-logo.png")}
                      style={{ width:80, height:80, resizeMode:"contain" }}
                    />
                    <Text style={{ fontSize:16, fontWeight:"600", marginLeft:10, color: colorScheme === "dark" ? "#fff" : "#000" }}>
                      Peoplestown Shuttle Bus
                    </Text>
                  </View>
                </SafeAreaView>
                <DrawerItemList {...props} />
              </DrawerContentScrollView>
            )}
          >

            {/* Public + user screens */}
            <Drawer.Screen name="home" options={{ title:"Home" }} />
            <Drawer.Screen
              name="payment"
              options={{
                title: "Payment",
                drawerItemStyle: { display: role === "user" ? "flex" : "none" }
              }}
            />
            <Drawer.Screen name="profile" options={{ title:"Profile" }} />
            <Drawer.Screen name="reserve" options={{ title:"Call to Reserve" }} />
            <Drawer.Screen name="faq" options={{ title:"FAQ" }} />

            {/* Hidden system screens */}
            <Drawer.Screen name="login" options={{ drawerItemStyle:{ display:"none" }}} />
            <Drawer.Screen name="register" options={{ drawerItemStyle:{ display:"none" }}} />
            <Drawer.Screen name="index" options={{ drawerItemStyle:{ display:"none" }}} />
            <Drawer.Screen name="how-to" options={{ drawerItemStyle:{ display:"none" }}} />

            {/* ADMIN ONLY */}
            <Drawer.Screen
              name="admin-dashboard"
              options={{
                title: "Admin Dashboard",
                drawerItemStyle: { display: role === "admin" ? "flex" : "none" }
              }}
            />

            {/* DRIVER + ADMIN ONLY */}
            <Drawer.Screen
              name="driver-dashboard"
              options={{
                title: "Driver Dashboard",
                drawerItemStyle: { display: (role === "driver" || role === "admin") ? "flex" : "none" }
              }}
            />

          </Drawer>

        </FontSizeProvider>
      </GuestProvider>
    </StripeProvider>
  );
}
