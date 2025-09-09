// src/screens/ChatScreen.js
import React from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  InteractionManager,
} from "react-native";
import { Send } from "lucide-react-native";
import MessageBubble from "../components/MessageBubble";
import TagChip from "../components/TagChip";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING } from "../theme";

const QUICK_CHIPS = [
  "Add car",
  "Breakfast + Pool",
  "Under $1500",
  "Non-stop flights",
  "4+ star hotels",
];

// Create a fresh component without any hooks first
function ChatScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Tell me your vibe"
        description="Try: 'SF → Doha, Nov 10–15, under $1500, pool + breakfast'"
      />

      <View style={styles.quickChips}>
        {QUICK_CHIPS.map((chip, index) => (
          <TagChip
            key={index}
            text={chip}
            onPress={() => console.log("Chip pressed:", chip)}
          />
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message TWOS..."
          placeholderTextColor={COLORS.textMuted}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Send size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Now let's gradually add state with proper React component syntax
class ChatScreenClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      isTyping: false,
      messages: [],
    };
    this.flatListRef = React.createRef();
  }

  addMessage = (newMessage) => {
    const messageWithId = { ...newMessage, id: Date.now().toString() };
    this.setState((prevState) => ({
      messages: [...prevState.messages, messageWithId],
    }));
  };

  removeTypingIndicators = () => {
    this.setState((prevState) => ({
      messages: prevState.messages.filter((msg) => !msg.isTyping),
    }));
  };

  handleSend = () => {
    const { message, isTyping } = this.state;
    if (!message.trim() || isTyping) return;

    Keyboard.dismiss();

    // Add user message
    const userMessage = {
      role: "user",
      text: message,
      timestamp: new Date(),
    };
    this.addMessage(userMessage);

    // Clear input
    this.setState({ message: "", isTyping: true });

    // Simulate bot typing with delay
    setTimeout(() => {
      // Add typing indicator
      this.addMessage({
        role: "bot",
        text: "Thinking...",
        timestamp: new Date(),
        isTyping: true,
      });

      // Final response after delay
      setTimeout(() => {
        // Remove typing indicators
        this.removeTypingIndicators();

        // Add final response
        this.addMessage({
          role: "bot",
          text: "Hi there! 👋 I'm TWOS, your travel planning assistant.",
          timestamp: new Date(),
        });

        this.setState({ isTyping: false });
      }, 1500);
    }, 800);
  };

  handleQuickChip = (chipText) => {
    this.setState({ message: chipText }, () => {
      setTimeout(() => {
        this.handleSend();
      }, 100);
    });
  };

  // 2) helper to scroll smoothly after RN finishes laying out the new item
  scrollToEndSmooth = () => {
    // give layout a beat, then animate
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        this.flatListRef.current?.scrollToEnd({ animated: true });
      });
    });
  };

  // 3) when messages change, glide to bottom
  componentDidUpdate(prevProps, prevState) {
    if (prevState.messages.length !== this.state.messages.length) {
      this.scrollToEndSmooth();
    }
  }

  renderMessage = ({ item }) => {
    if (item.isTyping) {
      return (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <MessageBubble role={item.role} text={item.text} time={item.timestamp} />
    );
  };

  render() {
    const { messages, message, isTyping } = this.state;

    return (
      <View style={styles.container}>
        <FlatList
          ref={this.flatListRef}
          data={messages}
          renderItem={this.renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesContainer,
            messages.length === 0 && styles.emptyContainer,
          ]}
          style={styles.messagesList}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <EmptyState
              title="Tell me your vibe"
              description="Try: 'SF → Doha, Nov 10–15, under $1500, pool + breakfast'"
            />
          }
          keyboardShouldPersistTaps="handled"
          // This makes sure we also scroll when the first layout happens
          onContentSizeChange={() => this.scrollToEndSmooth()}
        />

        <View style={styles.quickChips}>
          {QUICK_CHIPS.map((chip, index) => (
            <TagChip
              key={index}
              text={chip}
              onPress={() => this.handleQuickChip(chip)}
            />
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isTyping && styles.inputDisabled]}
            value={message}
            onChangeText={(text) => this.setState({ message: text })}
            placeholder="Message TWOS..."
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={this.handleSend}
            editable={!isTyping}
            multiline={true}
            maxLength={500}
          />
          <TouchableOpacity
            onPress={this.handleSend}
            style={[styles.sendButton, isTyping && styles.sendButtonDisabled]}
            disabled={isTyping}
          >
            <Send
              size={24}
              color={isTyping ? COLORS.textMuted : COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quickChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: SPACING.md,
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    maxHeight: 100,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    marginLeft: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: SPACING.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  typingContainer: {
    marginVertical: SPACING.xs,
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  typingBubble: {
    padding: SPACING.md,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  typingText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    fontStyle: "italic",
  },
});

// Export the class component instead of function component
export default ChatScreenClass;
