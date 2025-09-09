// Simple test component to check if basics work
// src/screens/TestChatScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../theme";

const TestChatScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat Screen Loaded Successfully!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
  },
});

export default TestChatScreen;
