import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../components/AppText";




if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type QA = {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
};

const CATEGORIES = [
  "All",
  "Account",
  "Payments",
  "Rides",
];

const FAQ_DATA: QA[] = [
  {
    id: "1",
    question: "How do I create an account?",
    answer:
      "Open the app → tap Log In → tap  Register Now! -> enter your name, email/phone → set a password.",
    category: "Account",
  },
  {
    id: "2",
    question: "What payment methods are supported?",
    answer:
      "We support major cards through Stripe. Apple Pay and Google Pay are available on compatible devices.",
    category: "Payments",
  },
  {
    id: "3",
    question: "How can I book a ride?",
    answer:
      "select a Pick Up Location from the 'Where from?' list → select a Drop Off Location from the 'Where To?' list → select the number of riders (minimum 1, maximum 5) → press continue and proceed with payment",
    category: "Rides",
  },
  {
    id: "4",
    question: "If I save my payment information, can people from People Revitalization Corporation see it?",
    answer:
      "No, payment information is saved through a third-party system called Stripe and is not visible to the people from PRC.",
    category: "Payments",
  },
  {
    id: "5",
    question: "How do I log out from my account?",
    answer:
      "Go to Profile → press Log Out",
    category: "Account",
  },
  {
    id: "6",
    question: "If signed in as a guest, what are my privacy notices",
    answer:
      "Your name, email or phone number is not stored in our database. Since payments are through Stripe there is no data collection on payment methods.",
    category: "Account",
  },
  {
    id: "7",
    question: "If I create an account, what are my privacy notices?",
    answer:
      "Your name, email or phone number is stored in our database. Since payments are through Stripe there is no data collection on payment methods.",
    category: "Account",
  },
  {
    id: "8",
    question: "Can we choose a custom pick up or drop off location?",
    answer:
      "No, we currently operate on a fixed schedule of pick up and drop off locations.",
    category: "Rides",
  },
  {
    id: "9",
    question: "Where can I find my confirmation number once I booked my ride?",
    answer:
      "Your confirmation number is located on the car icon button, on the top right of the home screen. ",
    category: "Rides",
  },
];

const deriveCategories = (items: { category: string }[]) => {
  const set = new Set(items.map(i => i.category).filter(Boolean));
  return ["All", ...Array.from(set)];
};

export default function FAQPage() {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState("");
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const listRef = useRef<FlatList<QA>>(null);
    const [category, setCategory] = useState("All");
    const categories = useMemo(() => deriveCategories(FAQ_DATA), []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
            return FAQ_DATA.filter((item) => {
            const matchCategory = category === "All" || item.category === category;
            const matchQuery =
                q.length === 0 ||
                item.question.toLowerCase().includes(q) ||
                item.answer.toLowerCase().includes(q) ||
                (item.tags ?? []).some((t) => t.toLowerCase().includes(q));
            return matchCategory && matchQuery;
            });
    }, [query, category]);

    const toggle = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
        });
    };

    const openEmail = () => {
        const subject = encodeURIComponent("Support Request");
        const body = encodeURIComponent("Hi team,\n\nI need help with...");
        Linking.openURL(`mailto:support@example.com?subject=${subject}&body=${body}`);
    };

    return (
        <SafeAreaView style={{flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 10,backgroundColor: "#fff"}}>
            <View style={{
            marginTop: 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}>
                <Pressable onPress={() => router.back()}>
                            <LinearGradient
                              colors={["#14b861ff", "#3bbc4eff"]}
                              start={[0, 0]}
                              end={[1, 1]}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 16,
                                borderRadius: 24,
                                flexDirection: "row",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOpacity: 0.15,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 4,
                              }}
                            >
                              <Ionicons name="arrow-back" size={18} color="#fff" />
                              <Text
                                style={{
                                  color: "white",
                                  marginLeft: 6,
                                  fontSize: 15,
                                  fontWeight: "600",
                                }}
                              >
                                Back
                              </Text>
                            </LinearGradient>
                          </Pressable>
            </View>

            <AppText style={styles.title}>FAQ</AppText>
            {/* Search */}
            <View style={styles.searchWrap}>
                <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search (e.g., payments, pickup)"
                placeholderTextColor="#9CA3AF"
                style={styles.search}
                returnKeyType="search"
                clearButtonMode="while-editing"/>
            </View>

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10, marginBottom: 30, paddingBottom: 40}}
              style={{ maxHeight: 52, marginBottom: 6 }} >
              {categories.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${c}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.catPill,
                      active ? styles.catPillActive : styles.catPillInactive,
                    ]}>
                    <AppText
                      style={[styles.catText, active ? styles.catTextActive : styles.catTextInactive]}
                      numberOfLines={1}>
                      {c}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* FAQ List */}
            <FlatList
                ref={listRef}
                style ={{ flex: 1 , marginBottom: 10}}
                data={filtered}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ padding:5, paddingBottom: 60, }}
                renderItem={({ item }) => {
                    const isOpen = openIds.has(item.id);
                    return (
                        <View style={styles.card}>
                        <Pressable onPress={() => toggle(item.id)} style={styles.questionRow}>
                            <AppText style={styles.qText}>{item.question}</AppText>
                            <AppText style={styles.chevron}>{isOpen ? "⌃" : "⌄"}</AppText>
                        </Pressable>
                        {isOpen && <AppText style={styles.aText}>{item.answer}</AppText>}
                        </View>
                    );
                }}/>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerTitle}>Still need help?</Text>
                <Pressable style={styles.ctaBtn} onPress={openEmail}>
                <Text style={styles.ctaText}>Contact Support</Text>
                </Pressable>
            </View>

        </SafeAreaView>
    )

}

const styles = StyleSheet.create({
  title: {fontSize: 28,
      fontWeight: "700",
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
      color: "#111827",
  },
    searchWrap: {paddingHorizontal: 16, marginBottom: 8 },
    search: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#111827",
  },
    catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  catPillInactive: {
    backgroundColor: "#EEF2F7",
    borderColor: "#E2E8F0",
  },
  catPillActive: {
    backgroundColor: "#3662AA",
    borderColor: "#0F172A",
  },
  catText: {
    fontSize: 14,
    fontWeight: "600",
  },
  catTextInactive: { color: "#0F172A" },
  catTextActive: { color: "#FFFFFF" },
  countText: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    color: "#6B7280",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    overflow: "hidden",
  },
  questionRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  qText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  chevron: { marginLeft: 12, fontSize: 18, color: "#6B7280" },
  aText: { color: "#374151", lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#F9FAFB",
  },
  footerTitle: { fontWeight: "700", fontSize: 16, color: "#111827", marginBottom: 8 },
  ctaBtn: {
    backgroundColor: "#14b861ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
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

})