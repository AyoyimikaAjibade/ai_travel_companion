// src/screens/PackagesScreen.js
import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import PackageCard from "../components/PackageCard";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { COLORS, SPACING } from "../theme";

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
    navigation.navigate("PackageDetails", { package: packageData });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton height={200} style={styles.skeletonItem} />
        <LoadingSkeleton height={200} style={styles.skeletonItem} />
        <LoadingSkeleton height={200} style={styles.skeletonItem} />
      </View>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Oops, something went wrong"
        description="We couldn't load the packages. Please try again later."
      />
    );
  }

  return (
    <View style={styles.container}>
      {packages.length === 0 ? (
        <EmptyState
          title="No packages yet"
          description="Start a chat to find travel packages tailored to your preferences."
        />
      ) : (
        <FlatList
          data={packages}
          renderItem={({ item }) => (
            <PackageCard
              title={item.title}
              total={item.total}
              score={item.score}
              bullets={item.bullets}
              onPress={() => handlePackagePress(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
  skeletonItem: {
    marginVertical: SPACING.sm,
  },
});

export default PackagesScreen;
