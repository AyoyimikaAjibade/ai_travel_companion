// src/screens/MyTripsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, MessageCircle } from "lucide-react-native";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import { formatCurrency } from "../utils/format";

const MyTripsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const chats = useSavedChatsStore((state) => state.chats);
  const deleteChat = useSavedChatsStore((state) => state.deleteChat);
  const renameChat = useSavedChatsStore((state) => state.renameChat);
  const setActiveChat = useSavedChatsStore((state) => state.setActiveChat);

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState(null);
  const [hydrated, setHydrated] = useState(
    useSavedChatsStore.persist?.hasHydrated?.() ?? true
  );

  useEffect(() => {
    const persist = useSavedChatsStore.persist;
    if (persist?.hasHydrated?.()) {
      setHydrated(true);
      return;
    }
    if (persist?.onFinish) {
      persist.onFinish(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, []);

  const sections = useMemo(() => {
    if (!Array.isArray(chats)) return [];

    const sorted = chats
      .filter((chat) => !chat.ephemeral)
      .sort((a, b) => {
        const aDate = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return bDate - aDate;
      });

    const booked = sorted.filter((chat) => chat.status === "booked");
    const saved = sorted.filter((chat) => chat.status !== "booked");

    const list = [];
    if (booked.length) list.push({ title: "Booked Trips", data: booked });
    if (saved.length) list.push({ title: "Saved Trips", data: saved });
    return list;
  }, [chats]);

  const openRename = (chat) => {
    setRenameTarget(chat.id);
    setRenameValue(chat.title || "");
    setRenameVisible(true);
  };

  const closeRename = () => {
    setRenameVisible(false);
    setRenameTarget(null);
    setRenameValue("");
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      Alert.alert("Rename trip", "Please enter a name for this trip.");
      return;
    }
    if (renameTarget) {
      renameChat(renameTarget, trimmed);
    }
    closeRename();
  };

  const confirmDelete = (chat) => {
    Alert.alert(
      "Delete trip",
      `Remove "${chat.title || "Untitled trip"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteChat(chat.id),
        },
      ],
      { cancelable: true }
    );
  };

  const handleContinue = (chat) => {
    setActiveChat(chat.id);
    if (chat.status === "booked" && chat.booking) {
      navigation.navigate("BookingConfirmation", {
        chatId: chat.id,
        booking: chat.booking,
      });
    } else {
      navigation.navigate("Chat", { chatId: chat.id });
    }
  };

  const renderTrip = ({ item }) => {
    const updatedAt = item?.updatedAt || item?.createdAt;
    const updatedLabel = updatedAt
      ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
      : "Recently";
    const isBooked = item.status === "booked";
    const bookingInfo = item.booking || {};
    const confirmedLabel = bookingInfo.confirmedAt
      ? formatDistanceToNow(new Date(bookingInfo.confirmedAt), {
          addSuffix: true,
        })
      : null;
    const amountLabel =
      bookingInfo.amount != null
        ? formatCurrency(bookingInfo.amount, bookingInfo.currency ?? "USD")
        : null;

    return (
      <View style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripTitle}>{item.title || "Untitled trip"}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => openRename(item)}
              style={styles.iconAction}
              activeOpacity={0.85}
            >
              <Pencil size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={[styles.iconAction, styles.deleteIcon]}
              activeOpacity={0.85}
            >
              <Trash2 size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.tripMeta}>
          {isBooked
            ? `Booked ${confirmedLabel ?? "recently"}`
            : `Updated ${updatedLabel}`}
        </Text>

        <Text style={styles.tripPreview}>
          {isBooked
            ? `${bookingInfo.provider ?? "Travel partner"} • ${
                bookingInfo.type ?? "Booking"
              }`
            : item.preview?.length
            ? item.preview
            : "Continue the conversation to build this itinerary."}
        </Text>

        {isBooked && amountLabel && (
          <Text style={styles.bookingAmount}>Total paid: {amountLabel}</Text>
        )}

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => handleContinue(item)}
          activeOpacity={0.88}
        >
          <MessageCircle size={18} color="#fff" />
          <Text style={styles.continueText}>
            {isBooked ? "View booking" : "Continue chat"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={[styles.container, { paddingTop: insets.top || SPACING.md }]}>
          <LoadingSkeleton height={120} style={styles.skeletonItem} />
          <LoadingSkeleton height={120} style={styles.skeletonItem} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.container, { paddingTop: insets.top ? SPACING.sm : SPACING.lg }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Your trips</Text>
          <Text style={styles.subtitle}>
            Continue planning or revisit bookings you’ve already confirmed.
          </Text>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="No saved trips yet"
              description="Plan a trip in chat and it will show up here with options to rename or delete."
            />
          </View>
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderTrip}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}

        <Modal
          visible={renameVisible}
          transparent
          animationType="fade"
          onRequestClose={closeRename}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename trip</Text>
              <Text style={styles.modalSubtitle}>
                Give this saved conversation a memorable name.
              </Text>
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Trip name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.modalInput}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={closeRename}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSubmit]}
                  onPress={submitRename}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 26,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  sectionHeader: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tripCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  tripTitle: {
    flex: 1,
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  tripMeta: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  tripPreview: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  bookingAmount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  continueText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,14,0.85)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: "rgba(16,23,42,0.98)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.65)",
    marginBottom: SPACING.md,
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  modalCancel: {
    backgroundColor: "rgba(148,163,184,0.22)",
  },
  modalSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  skeletonItem: {
    marginBottom: SPACING.sm,
  },
});

export default MyTripsScreen;
