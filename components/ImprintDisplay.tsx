import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ChevronLeft, ChevronRight, Info } from "lucide-react-native";
import { mockImprintMockups, mockLineItems } from "@/mocks/jobs";

interface ImprintDisplayProps {
  jobId: string;
}

export function ImprintDisplay({ jobId }: ImprintDisplayProps) {
  const [selectedImprintIndex, setSelectedImprintIndex] = useState(0);
  
  const imprints = mockImprintMockups.filter(mockup => mockup.jobId === jobId);
  const lineItems = mockLineItems.filter(item => item.jobId === jobId);
  
  if (imprints.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noImprintContainer}>
          <Info size={32} color="#9ca3af" />
          <Text style={styles.noImprintText}>No imprint mockups available</Text>
        </View>
      </View>
    );
  }

  const currentImprint = imprints[selectedImprintIndex];

  const nextImprint = () => {
    setSelectedImprintIndex((prev) => (prev + 1) % imprints.length);
  };

  const prevImprint = () => {
    setSelectedImprintIndex((prev) => (prev - 1 + imprints.length) % imprints.length);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Imprint Reference</Text>
        {imprints.length > 1 && (
          <Text style={styles.imprintCounter}>
            {selectedImprintIndex + 1} of {imprints.length}
          </Text>
        )}
      </View>

      <View style={styles.mockupContainer}>
        <Image 
          source={{ uri: currentImprint.imageUrl }} 
          style={styles.mockupImage}
          resizeMode="contain"
        />
        
        {imprints.length > 1 && (
          <>
            <TouchableOpacity 
              style={[styles.navButton, styles.prevButton]} 
              onPress={prevImprint}
            >
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, styles.nextButton]} 
              onPress={nextImprint}
            >
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.imprintInfo}>
          <Text style={styles.positionText}>{currentImprint.position}</Text>
          <Text style={styles.descriptionText}>{currentImprint.description}</Text>
          
          <View style={styles.colorsContainer}>
            <Text style={styles.colorsLabel}>Colors:</Text>
            <View style={styles.colorsList}>
              {currentImprint.colors.map((color, index) => (
                <View key={index} style={styles.colorChip}>
                  <Text style={styles.colorText}>{color}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {imprints.length > 1 && (
          <View style={styles.imprintTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imprints.map((imprint, index) => (
                <TouchableOpacity
                  key={imprint.id}
                  style={[
                    styles.imprintTab,
                    selectedImprintIndex === index && styles.imprintTabActive,
                  ]}
                  onPress={() => setSelectedImprintIndex(index)}
                >
                  <Text style={[
                    styles.imprintTabText,
                    selectedImprintIndex === index && styles.imprintTabTextActive,
                  ]}>
                    {imprint.position}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.garmentInfo}>
        <Text style={styles.garmentTitle}>Garment Details</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.garmentCard}>
              <Text style={styles.garmentSku}>{item.sku}</Text>
              <Text style={styles.garmentDetails}>
                {item.color} • {item.size}
              </Text>
              <Text style={styles.garmentQty}>{item.quantity} units</Text>
              {item.description && (
                <Text style={styles.garmentDescription}>{item.description}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    margin: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  imprintCounter: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  mockupContainer: {
    position: "relative",
    height: 250,
    backgroundColor: "#f9fafb",
  },
  mockupImage: {
    width: "100%",
    height: "100%",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  prevButton: {
    left: 12,
  },
  nextButton: {
    right: 12,
  },
  detailsContainer: {
    padding: 16,
  },
  imprintInfo: {
    marginBottom: 16,
  },
  positionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  colorsList: {
    flexDirection: "row",
    gap: 6,
  },
  colorChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#1e40af",
    borderRadius: 12,
  },
  colorText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  imprintTabs: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  imprintTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  imprintTabActive: {
    backgroundColor: "#1e40af",
  },
  imprintTabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  imprintTabTextActive: {
    color: "white",
  },
  garmentInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  garmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  garmentCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  garmentSku: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  garmentDetails: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  garmentQty: {
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "500",
    marginBottom: 4,
  },
  garmentDescription: {
    fontSize: 10,
    color: "#9ca3af",
    lineHeight: 12,
  },
  noImprintContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  noImprintText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
});