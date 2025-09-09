import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { format } from "date-fns";
import GradientBackground from "./GradientBackground";
import { COLORS, GRADIENTS, BORDER_RADIUS, SPACING } from "../theme";

const MessageBubble = ({ role, text, time, isTyping }) => {
  const isUser = role === "user";

  if (isTyping) {
    return (
      <View style={[styles.row, { justifyContent: "flex-start" }]}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>{text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      {isUser ? (
        <GradientBackground
          colors={GRADIENTS.primary}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{text}</Text>
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}
        </GradientBackground>
      ) : (
        <View style={styles.botBubble}>
          <Text style={styles.botText}>{text}</Text>
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full-width row so we can align left/right cleanly
  row: {
    width: "100%",
    flexDirection: "row",
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },

  // Bubbles should NOT flex; they should wrap content and be width-capped
  userBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.xs,
  },
  botBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typingBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  userText: {
    color: "#FFFFFF",
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  botText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  typingText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    fontStyle: "italic",
  },

  timeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    alignSelf: "flex-end",
    marginTop: SPACING.xs,
  },
});

export default MessageBubble;
