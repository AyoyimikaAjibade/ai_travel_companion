// src/screens/MyTripsScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, MessageCircle } from "lucide-react-native";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import { formatCurrency } from "../utils/format";
import { normalizeBookingLedger, getActiveBookings } from "../utils/booking";
import { useSessionStore } from "../stores/sessionStore";
import { fetchChats, fetchChatMessages } from "../lib/api";
import LottieView from "lottie-react-native";

const serviceTypeLabel = (type) => {
  const normalized = (type || "").toLowerCase();
  switch (normalized) {
    case "flight":
      return "Flight";
    case "hotel":
      return "Hotel";
    case "car":
    case "rental":
      return "Car";
    case "attraction":
    case "experience":
      return "Attraction";
    case "combined":
      return "Package";
    default:
      return "Booking";
  }
};
const MyTripsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const chats = useSavedChatsStore((state) => state.chats);
  const deleteChat = useSavedChatsStore((state) => state.deleteChat);
  const renameChat = useSavedChatsStore((state) => state.renameChat);
  const setActiveChat = useSavedChatsStore((state) => state.setActiveChat);
  const updateChatContent = useSavedChatsStore(
    (state) => state.updateChatContent
  );
  const accessToken = useSessionStore((s) => s.accessToken);

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState(null);
  const [hydrated, setHydrated] = useState(
    useSavedChatsStore.persist?.hasHydrated?.() ?? true
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAnimKey, setRefreshAnimKey] = useState(0);
  const [syncingChatId, setSyncingChatId] = useState(null);
  const refreshLottieRef = useRef(null);
  const bgDrift = useSharedValue(0);

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

  const mapServerMessages = (serverMessages = []) => {
    const mapped = [];
    let latestSlots = null;
    let latestMissing = [];

    serverMessages.forEach((msg) => {
      const ts = msg?.updated_time ?? msg?.created_time ?? Date.now();
      const ai = msg?.ai_response_data;
      if (msg?.role === "user") {
        mapped.push({
          id: msg.id ?? ts,
          role: "user",
          text: msg.content ?? "",
          timestamp: new Date(ts),
        });
        return;
      }

      const plan =
        ai && (ai.plan_id || ai.planId || ai.flight || ai.hotel || ai.car)
          ? {
              planId: ai.plan_id ?? ai.planId ?? null,
              slotId:
                ai.slot_id ??
                ai.slotId ??
                ai.current_slots?.slot_id ??
                latestSlots?.slot_id ??
                null,
              flight: ai.flight ?? null,
              hotel: ai.hotel ?? null,
              car: ai.car ?? null,
              attractions: Array.isArray(ai.attractions) ? ai.attractions : [],
              currentSlots: ai.current_slots ?? latestSlots ?? null,
            }
          : null;

      if (ai?.current_slots) {
        latestSlots = ai.current_slots;
      }
      if (Array.isArray(ai?.missing)) {
        latestMissing = ai.missing;
      }

      mapped.push({
        id: msg.id ?? `bot-${ts}`,
        role: "bot",
        text: msg.content ?? ai?.reply ?? "",
        timestamp: new Date(ts),
        plan,
      });
    });

    return {
      messages: mapped,
      currentSlots: latestSlots,
      missing: latestMissing,
    };
  };

  const hydrateRemoteChats = React.useCallback(async () => {
    const animKey = Date.now();
    setRefreshAnimKey(animKey);
    setRefreshing(true);
    const start = Date.now();
    if (!accessToken) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => setRefreshing(false), remaining);
      return;
    }
    try {
      const remote = await fetchChats(accessToken, { skip: 0, limit: 5 });
      if (Array.isArray(remote)) {
        remote.forEach((entry) => {
          const slots = entry?.current_slots;
          const chatId = slots?.chat_id ?? slots?.slot_id;
          if (!chatId || !slots) return;
          const title =
            slots.origin_airport_code && slots.destination_airport_code
              ? `${slots.origin_airport_code} ✈️ ${slots.destination_airport_code}`
              : undefined;
          const preview = slots.destination_city_name
            ? `Trip to ${slots.destination_city_name}`
            : undefined;
          updateChatContent(chatId, [], {
            currentSlots: slots,
            sessionId: slots.slot_id ?? null,
            phase: "idle",
            status: "draft",
            title,
            preview,
            forcePersist: true,
          });
        });
      }
    } catch (err) {
      console.warn("Unable to load trips", err?.message || err);
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setRefreshing(false);
      }, remaining);
    }
  }, [accessToken, updateChatContent]);

  useEffect(() => {
    if (refreshing && refreshLottieRef.current) {
      try {
        // Start from mid animation (approx frame 30) for a quick visual
        refreshLottieRef.current.play(30, 200);
      } catch {
        refreshLottieRef.current?.play?.();
      }
    }
  }, [refreshing, refreshAnimKey]);

  const bgLayerStyle = useAnimatedStyle(() => {
    const shift = (bgDrift.value || 0) * 12;
    return {
      transform: [{ translateY: shift - 6 }],
    };
  });

  useEffect(() => {
    hydrateRemoteChats();
  }, [hydrateRemoteChats]);

  useEffect(() => {
    bgDrift.value = withRepeat(
      withTiming(1, { duration: 9000 }),
      -1,
      true
    );
  }, [bgDrift]);

  const ContinueButton = ({ onPress, children }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onPress}
          activeOpacity={0.88}
          onPressIn={() => (scale.value = withSpring(0.97, { damping: 14 }))}
          onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

  const handleContinue = async (chat) => {
    const navigateToExistingBooking = () => {
      const bookingLedger = normalizeBookingLedger(chat.booking);
      const records = Object.values(bookingLedger.records || {});
      if (records.length) {
        const active = getActiveBookings(bookingLedger);
        const firstRecord = active[0] ?? records[0];
        navigation.navigate("BookingConfirmation", {
          chatId: chat.id,
          serviceKey: firstRecord?.serviceKey,
          batchId: firstRecord?.batchId ?? undefined,
        });
        return true;
      }
      return false;
    };

    if (!accessToken) {
      setActiveChat(chat.id);
      if (!navigateToExistingBooking()) {
        navigation.navigate("Chat", { chatId: chat.id });
      }
      return;
    }

    setSyncingChatId(chat.id);
    try {
      const serverMessages = await fetchChatMessages(accessToken, chat.id, {
        skip: 0,
        limit: 100,
      });
      const { messages, currentSlots, missing } = mapServerMessages(
        Array.isArray(serverMessages) ? serverMessages : []
      );
      updateChatContent(chat.id, messages, {
        currentSlots: currentSlots ?? chat.currentSlots ?? null,
        missing: missing ?? chat.missing ?? [],
        sessionId:
          currentSlots?.slot_id ??
          currentSlots?.session_id ??
          chat.sessionId ??
          null,
        phase: "idle",
        status: "draft",
      });
      setActiveChat(chat.id);
      if (!navigateToExistingBooking()) {
        navigation.navigate("Chat", { chatId: chat.id });
      }
    } catch (error) {
      const message =
        error?.message ?? "Could not load chat history from the server.";
      Alert.alert("Trips", message);
    } finally {
      setSyncingChatId(null);
    }
  };

  const renderTrip = ({ item }) => {
    const updatedAt = item?.updatedAt || item?.createdAt;
    const updatedLabel = updatedAt
      ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
      : "Recently";
    const bookingLedger = normalizeBookingLedger(item.booking);
    const allRecords = Object.values(bookingLedger.records || {});
    const activeRecords = getActiveBookings(bookingLedger);
    const firstActive = activeRecords[0] ?? allRecords[0] ?? null;
    const totalAmount = activeRecords.reduce(
      (sum, record) => sum + (Number(record.amount) || 0),
      0
    );
    const amountLabel =
      totalAmount > 0
        ? formatCurrency(
            totalAmount,
            firstActive?.currency ?? activeRecords[0]?.currency ?? "USD"
          )
        : null;
    const confirmedLabel = firstActive?.confirmedAt
      ? formatDistanceToNow(new Date(firstActive.confirmedAt), {
          addSuffix: true,
        })
      : null;
    const displayRecords = activeRecords.length ? activeRecords : allRecords;
    const providers = Array.from(
      new Set(
        displayRecords
          .map((record) => record.provider)
          .filter((providerName) => typeof providerName === "string")
      )
    );
    const servicesSummary = displayRecords
      .map((record) => serviceTypeLabel(record.serviceType))
      .filter(Boolean)
      .join(" • ");
    const summaryParts = [];
    if (servicesSummary) summaryParts.push(servicesSummary);
    if (providers.length) summaryParts.push(providers.join(" • "));
    const bookingPreview = displayRecords.length
      ? summaryParts.length
        ? summaryParts.join(" • ")
        : "Confirmed itinerary"
      : item.preview?.length
      ? item.preview
      : "Continue the conversation to build this itinerary.";
    const hasAnyBookings = allRecords.length > 0;
    const isBooked = item.status === "booked" && activeRecords.length > 0;
    const isCancelled =
      item.status === "cancelled" && hasAnyBookings && !activeRecords.length;

    return (
      <Animated.View
        style={styles.tripCard}
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
      >
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
            : isCancelled
            ? `Cancelled ${updatedLabel}`
            : `Updated ${updatedLabel}`}
        </Text>

        <Text style={styles.tripPreview}>
          {hasAnyBookings
            ? bookingPreview
            : item.preview?.length
            ? item.preview
            : "Continue the conversation to build this itinerary."}
        </Text>

        {hasAnyBookings && amountLabel && (
          <Text style={styles.bookingAmount}>Total paid: {amountLabel}</Text>
        )}

        <ContinueButton onPress={() => handleContinue(item)}>
          <MessageCircle size={18} color="#fff" />
          <Text style={styles.continueText}>
            {hasAnyBookings ? "View bookings" : "Continue chat"}
          </Text>
        </ContinueButton>
      </Animated.View>
    );
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View
          style={[styles.container, { paddingTop: insets.top || SPACING.md }]}
        >
          <LoadingSkeleton height={120} style={styles.skeletonItem} />
          <LoadingSkeleton height={120} style={styles.skeletonItem} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top ? SPACING.sm : SPACING.lg },
        ]}
      >
        <View style={styles.bgParallax} pointerEvents="none">
          <Animated.View
            style={[styles.bgOrb, styles.bgOrbLeft, bgLayerStyle]}
          />
          <Animated.View
            style={[styles.bgOrb, styles.bgOrbRight, bgLayerStyle]}
          />
        </View>
        {refreshing && (
          <View pointerEvents="none" style={styles.refreshOverlay}>
            <LottieView
              key={refreshAnimKey}
              source={require("../../assets/lottie/airplane-logistics.json")}
              ref={refreshLottieRef}
              autoPlay={false}
              loop
              speed={1.5}
              style={styles.refreshAnimOverlay}
            />
          </View>
        )}
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(320)}
          layout={Layout.springify().damping(18)}
        >
          <Text style={styles.title}>Your trips</Text>
          <Text style={styles.subtitle}>
            Continue planning or revisit bookings you’ve already confirmed.
          </Text>
        </Animated.View>

        {sections.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.emptyWrapper, { flexGrow: 1 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={hydrateRemoteChats}
                tintColor="rgba(0,0,0,0)"
                colors={["rgba(0,0,0,0)"]}
                progressBackgroundColor="rgba(0,0,0,0)"
                progressViewOffset={-5000}
              />
            }
            alwaysBounceVertical
          >
            <EmptyState
              title="No saved trips yet"
              description="Pull to refresh to sync your server chats, or plan a trip in chat and it will show up here."
            />
          </ScrollView>
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderTrip}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <Animated.Text
                entering={FadeInDown.duration(260)}
                layout={Layout.springify()}
                style={styles.sectionHeader}
              >
                {section.title}
              </Animated.Text>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={hydrateRemoteChats}
                tintColor="rgba(0,0,0,0)"
                colors={["rgba(0,0,0,0)"]}
                progressBackgroundColor="rgba(0,0,0,0)"
                progressViewOffset={-5000}
              />
            }
            alwaysBounceVertical
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
    marginBottom: SPACING.sm,
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
  refreshAnimWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
  },
  refreshAnim: {
    width: 180,
    height: 180,
  },
  refreshAnimOverlay: {
    width: 170,
    height: 170,
  },
  refreshOverlay: {
    position: "absolute",
    top: SPACING.lg * 2,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  hiddenRefresh: {
    height: 0.001,
    opacity: 0,
  },
  bgParallax: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    overflow: "hidden",
  },
  bgOrb: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(59,130,246,0.16)",
  },
  bgOrbLeft: {
    top: -140,
    left: -120,
  },
  bgOrbRight: {
    top: 80,
    right: -160,
    backgroundColor: "rgba(244,114,182,0.14)",
  },
});

export default MyTripsScreen;
