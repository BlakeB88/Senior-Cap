import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";

type Props = {
  visible: boolean;
  onSubmit: (rating: number, text: string) => void;
  onSkip: () => void;
};

export default function RideReviewModal({ visible, onSubmit, onSkip }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");

  const handleStarPress = (value: number) => {
    setRating(value);
  };

  const handleSubmit = () => {
    if (!rating) return; // rating required
    onSubmit(rating, text.trim());
    setRating(null);
    setText("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>How was your ride?</Text>
          <Text style={styles.subtitle}>
            Please rate your experience. Comments are optional.
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => handleStarPress(n)}
                style={styles.starButton}
              >
                <Text style={[ styles.star, rating && n <= rating ? styles.starActive : null,]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional text */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Anything you'd like to share? (optional)"
            style={styles.input}
            multiline
          />

          <View style={styles.buttonsRow}>
            <TouchableOpacity onPress={onSkip} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.primaryButton,
                !rating && { opacity: 0.4 },
              ]}
              disabled={!rating}
            >
              <Text style={styles.primaryText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  starButton: { padding: 4 },
  star: { fontSize: 28, color: "#D1D5DB" },
  starActive: { color: "#FBBF24" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    minHeight: 70,
    textAlignVertical: "top",
    marginTop: 8,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  secondaryText: { color: "#6B7280", fontWeight: "600" },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#16A34A",
    borderRadius: 999,
  },
  primaryText: { color: "white", fontWeight: "700" },
});
