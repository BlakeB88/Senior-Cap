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

export default function CallReservePage() {

    return (
         <SafeAreaView style={{flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 14,backgroundColor: "#fff"}}>
            <View style={{
              marginTop: 4,
              paddingHorizontal: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10, }}>

              {/* BACK BUTTON */}
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

            <View style={styles.content}>
                <Text style={styles.title}>Call to Reserve</Text> 
              </View>
         </SafeAreaView>

        
    )

}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 30, flex: 1 },
    title: { fontSize: 28, fontWeight: "700", marginBottom: 5, color: "#000" },

}) 
