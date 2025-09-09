// src/screens/PackageDetailsScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { Plane, Hotel, Car, MapPin, ExternalLink } from "lucide-react-native";
import GradientButton from "../components/GradientButton";
import DeeplinkRow from "../components/DeeplinkRow";
import { useTripsStore } from "../stores/tripsStore";
import { COLORS, SPACING } from "../theme";

const PackageDetailsScreen = ({ route }) => {
  const { package: packageData } = route.params;
  const addTrip = useTripsStore((state) => state.addTrip);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTrip = async () => {
    try {
      setIsSaving(true);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Save to local store
      addTrip({
        destination: packageData.destination,
        dates: `${packageData.dates.start} to ${packageData.dates.end}`,
        total: packageData.total,
        status: "pending",
        packageData: packageData,
      });

      Alert.alert("Success", "Trip saved successfully! 🎉");
    } catch (error) {
      Alert.alert("Error", "Failed to save trip. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{packageData.title}</Text>
        <Text style={styles.price}>${packageData.total.toLocaleString()}</Text>
        <Text style={styles.score}>{packageData.score}/10 match</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Plane size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Flight</Text>
        </View>
        <Text style={styles.sectionText}>{packageData.flight.description}</Text>
        <DeeplinkRow
          title="Book on Expedia"
          url={packageData.flight.deeplink}
          icon={ExternalLink}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Hotel size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Hotel</Text>
        </View>
        <Text style={styles.sectionText}>{packageData.hotel.description}</Text>
        <DeeplinkRow
          title="Book on Booking.com"
          url={packageData.hotel.deeplink}
          icon={ExternalLink}
        />
      </View>

      {packageData.car && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Car Rental</Text>
          </View>
          <Text style={styles.sectionText}>{packageData.car.description}</Text>
          <DeeplinkRow
            title="Book on Hertz"
            url={packageData.car.deeplink}
            icon={ExternalLink}
          />
        </View>
      )}

      {packageData.attractions && packageData.attractions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Attractions</Text>
          </View>
          {packageData.attractions.map((attraction, index) => (
            <DeeplinkRow
              key={index}
              title={attraction.name}
              url={attraction.deeplink}
              icon={ExternalLink}
            />
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <GradientButton
          title="Save Trip"
          onPress={handleSaveTrip}
          loading={isSaving}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  price: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  score: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_500Medium",
    fontSize: 16,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 18,
    marginLeft: SPACING.sm,
  },
  sectionText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  actions: {
    marginVertical: SPACING.lg,
  },
});

export default PackageDetailsScreen;
