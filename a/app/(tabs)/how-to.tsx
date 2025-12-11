import { Image } from 'expo-image';
import { Platform, StyleSheet , TouchableOpacity, View, ScrollView, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { router} from 'expo-router';
import AppText from 'components/AppText';
import React, { useState } from "react";

interface Topic {
  id: string;
  label: string;
  emoji: string;
  steps: string[];
}

const TOPICS = [
  {
    id: "book",
    label: "Book a Ride",
    emoji: "🚗",
    steps: [
      "From the dashboard, tap “Book Ride”.",
      "Enter your pickup and destination locations.",
      "Choose your ride type (Standard, Premium, Shared, etc.).",
      "Check the fare estimate and pickup time.",
      "Tap “Confirm Ride” to request your driver and track them on the map.",
    ],
  },
  {
    id: "profile",
    label: "Profile",
    emoji: "👤",
    steps: [
      "Tap the profile icon on the top-right of the app.",
      "View or edit your name, photo, phone number and email.",
      "See your ride history and ratings.",
      "Update your notification and privacy settings.",
    ],
  },
  {
    id: "payment",
    label: "Payment",
    emoji: "💳",
    steps: [
      "Go to Profile → Payment (or Wallet tab).",
      "Tap “Add Payment Method” to add a card or wallet.",
      "Set a default payment method for faster checkout.",
      "Review past trip receipts if needed.",
    ],
  },
  {
    id: "faq",
    label: "Help & FAQ",
    emoji: "❓",
    steps: [
      "Open the main menu (☰) from the dashboard.",
      "Tap “Help & FAQ”.",
      "Browse topics like pricing, safety, account and rides.",
      "If you still need help, tap “Contact Support” to chat or email us.",
    ],
  },
];

export default function HowToPage() {
    const [topicIndex, setTopicIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const currentTopic = TOPICS[topicIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === currentTopic.steps.length - 1;
  const isLastTopic = topicIndex === TOPICS.length - 1;

  const handleSelectTopic = (index: number) => {
    setTopicIndex(index);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex((prev) => prev + 1);
    } else {
      // if last step in topic, move to next topic (or loop back to first)
      if (!isLastTopic) {
        setTopicIndex((prev) => prev + 1);
        setStepIndex(0);
      } else {
        // finished everything → loop back to first topic
        setTopicIndex(0);
        setStepIndex(0);
      }
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setStepIndex((prev) => prev - 1);
    } else {
      // if first step, go to previous topic's last step (if exists)
      if (topicIndex > 0) {
        const prevTopicIndex = topicIndex - 1;
        const lastStepOfPrev =
          TOPICS[prevTopicIndex].steps.length - 1;

        setTopicIndex(prevTopicIndex);
        setStepIndex(lastStepOfPrev);
      }
    }
  };
    return(
        <SafeAreaView style={{flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 14,backgroundColor: "#fff"}}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
            <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.title}>How To Use the Peoplstown Shuttle Bus App</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsRow}>
          {TOPICS.map((topic, index) => {
            const isActive = index === topicIndex;
            return (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicPill,
                  isActive && styles.topicPillActive,
                ]}
                onPress={() => handleSelectTopic(index)}
              >
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                <Text
                  style={[
                    styles.topicLabel,
                    isActive && styles.topicLabelActive,
                  ]}
                >
                  {topic.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main interactive card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {currentTopic.emoji} {currentTopic.label}
          </Text>
          <Text style={styles.stepCount}>
            Step {stepIndex + 1} of {currentTopic.steps.length}
          </Text>
        </View>

        <View style={styles.stepBox}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{stepIndex + 1}</Text>
          </View>
          <Text style={styles.stepText}>
            {currentTopic.steps[stepIndex]}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {currentTopic.steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === stepIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={handleBack}
            disabled={topicIndex === 0 && isFirstStep}
            style={[
              styles.secondaryButton,
              topicIndex === 0 &&
                isFirstStep &&
                styles.disabledButton,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                topicIndex === 0 &&
                  isFirstStep &&
                  styles.disabledText,
              ]}
            >
              ← Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {isLastStep && isLastTopic ? "Start Over" : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

        


        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
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

  title: {fontSize: 28,
      fontWeight: "700",
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
      color: "#111827",
  },

  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.3,
  },
  disabledText: {
    color: "#9CA3AF",
  },

  stepBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: "#2563EB",
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  stepCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  stepBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },

  topicPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  topicPillActive: {
    backgroundColor: "#2563EB",
  },
  topicEmoji: {
    marginRight: 6,
    fontSize: 14,
  },
  topicLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  topicLabelActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  topicsRow: {
    marginBottom: 16,
  },
  
});