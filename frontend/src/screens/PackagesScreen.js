// src/screens/PackagesScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import PackageCard from "../components/PackageCard";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { COLORS, SPACING } from "../theme";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";

// Mock data for demonstration
const MOCK_PACKAGES = {
  packages: [
    {
      id: "pkg_1",
      title: "Best Value Package",
      total: 1420,
      score: 9.2,
      destination: "Doha",
      dates: { start: "2023-11-10", end: "2023-11-15" },
      bullets: [
        "Non-stop flights on Qatar Airways",
        "5-star hotel with breakfast included",
        "Infinity pool with city views",
        "Free airport transfer",
      ],
      flight: {
        description: "Qatar Airways, Economy Class, Non-stop",
        deeplink: "https://www.expedia.com/Flight-Search",
      },
      hotel: {
        description: "Souq Waqif Boutique Hotels, 5 stars, Breakfast included",
        deeplink: "https://www.booking.com/Hotel-View",
      },
      car: {
        description: "Intermediate SUV with unlimited mileage",
        deeplink: "https://www.hertz.com/Car-Rental",
      },
      attractions: [
        {
          name: "Souq Waqif Market Tour",
          deeplink: "https://www.tiqets.com/Souq-Waqif-Tour",
        },
        {
          name: "Dhow Cruise with Dinner",
          deeplink: "https://www.tiqets.com/Dhow-Cruise",
        },
      ],
    },
    {
      id: "pkg_2",
      title: "Comfort Package",
      total: 1675,
      score: 8.7,
      destination: "Doha",
      dates: { start: "2023-11-10", end: "2023-11-15" },
      bullets: [
        "1-stop flights on Emirates",
        "4-star beachfront resort",
        "Private pool access",
        "Spa credit included",
      ],
      flight: {
        description: "Emirates, Economy Class, 1 stop in Dubai",
        deeplink: "https://www.expedia.com/Flight-Search",
      },
      hotel: {
        description: "The Pearl Resort, 4 stars, Beachfront",
        deeplink: "https://www.booking.com/Hotel-View",
      },
      attractions: [
        {
          name: "Desert Safari Experience",
          deeplink: "https://www.tiqets.com/Desert-Safari",
        },
      ],
    },
    {
      id: "pkg_3",
      title: "Budget Package",
      total: 1125,
      score: 7.8,
      destination: "Doha",
      dates: { start: "2023-11-10", end: "2023-11-15" },
      bullets: [
        "2-stop flights on Oman Air",
        "3-star city center hotel",
        "Complimentary breakfast",
        "Walking distance to attractions",
      ],
      flight: {
        description: "Oman Air, Economy Class, 2 stops",
        deeplink: "https://www.expedia.com/Flight-Search",
      },
      hotel: {
        description: "City Center Hotel, 3 stars, Central location",
        deeplink: "https://www.booking.com/Hotel-View",
      },
    },
  ],
};

const PackagesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { convertCurrency, targetCurrency } = useCurrencyConverter();
  const displayCurrency = targetCurrency || "USD";
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Use mock data
      setPackages(MOCK_PACKAGES.packages);
    } catch (error) {
      console.error("Failed to load packages:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handlePackagePress = (packageData) => {
    navigation.navigate("PackageDetails", {
      package: packageData,
    });
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <LoadingSkeleton height={200} style={styles.skeletonItem} />
      <LoadingSkeleton height={200} style={styles.skeletonItem} />
      <LoadingSkeleton height={200} style={styles.skeletonItem} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.container, { paddingTop: insets.top ? SPACING.sm : SPACING.lg }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Suggested packages</Text>
          <Text style={styles.subtitle}>
            Curated bundles with flights, stays, and extras to jump-start your trip.
          </Text>
        </View>

        {isLoading ? (
          renderSkeleton()
        ) : isError ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="Oops, something went wrong"
              description="We couldn't load the packages. Please try again later."
            />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="No packages yet"
              description="Start a chat to find travel packages tailored to your preferences."
            />
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={({ item }) => {
              const convertedTotal = convertCurrency(
                item.total,
                item.currency,
                displayCurrency
              );
              const twosFee = convertedTotal * 0.05;
              const packageWithConversion = {
                ...item,
                total: convertedTotal,
                currency: displayCurrency,
                twosFee,
              };
              return (
                <PackageCard
                  title={packageWithConversion.title}
                  total={packageWithConversion.total}
                  currency={displayCurrency}
                  twosFee={packageWithConversion.twosFee}
                  score={packageWithConversion.score}
                  bullets={packageWithConversion.bullets}
                  onPress={() => handlePackagePress(packageWithConversion)}
                />
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadPackages}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
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
    paddingBottom: SPACING.md,
  },
  skeletonContainer: {
    flex: 1,
  },
  skeletonItem: {
    marginVertical: SPACING.sm,
  },
});

export default PackagesScreen;
