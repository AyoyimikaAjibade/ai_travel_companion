// src/screens/MyTripsScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { CheckCircle, Clock, XCircle } from "lucide-react-native";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";

// Mock data for trips
const MOCK_TRIPS = [
  {
    id: "trip_1",
    destination: "Doha, Qatar",
    dates: "Nov 10 - Nov 15, 2023",
    total: 1420,
    status: "confirmed",
    packageData: {
      title: "Best Value Package",
      score: 9.2,
    },
  },
  {
    id: "trip_2",
    destination: "Bali, Indonesia",
    dates: "Dec 20 - Dec 30, 2023",
    total: 2150,
    status: "pending",
    packageData: {
      title: "Luxury Beach Retreat",
      score: 9.5,
    },
  },
];

const MyTripsScreen = () => {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const loadTrips = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Use mock data
      setTrips(MOCK_TRIPS);
    } catch (error) {
      console.error("Failed to load trips:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle size={20} color={COLORS.success} />;
      case "pending":
        return <Clock size={20} color={COLORS.warning} />;
      case "cancelled":
        return <XCircle size={20} color={COLORS.error} />;
      default:
        return <Clock size={20} color={COLORS.warning} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "Confirmed ✅";
      case "pending":
        return "Pending ⏳";
      case "cancelled":
        return "Cancelled ❌";
      default:
        return "Pending ⏳";
    }
  };

  const renderTrip = ({ item }) => (
    <TouchableOpacity style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripDestination}>{item.destination}</Text>
        <View style={styles.status}>
          {getStatusIcon(item.status)}
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.tripDates}>{item.dates}</Text>

      <View style={styles.tripFooter}>
        <Text style={styles.tripTotal}>${item.total.toLocaleString()}</Text>
        <Text style={styles.tripDetails}>View details</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton height={120} style={styles.skeletonItem} />
        <LoadingSkeleton height={120} style={styles.skeletonItem} />
        <LoadingSkeleton height={120} style={styles.skeletonItem} />
      </View>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Oops, something went wrong"
        description="We couldn't load your trips. Please try again later."
      />
    );
  }

  return (
    <View style={styles.container}>
      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Save a travel package to see it here. Your future adventures await!"
        />
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadTrips}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  tripCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
  },
  tripDestination: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 18,
    flex: 1,
    marginRight: SPACING.sm,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 14,
    marginLeft: SPACING.xs,
  },
  tripDates: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_400Regular",
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripTotal: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
  },
  tripDetails: {
    color: COLORS.primary,
    fontFamily: "Urbanist_500Medium",
    fontSize: 14,
  },
  skeletonItem: {
    marginVertical: SPACING.xs,
  },
});

export default MyTripsScreen;
