import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { X, Package } from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";

export default function ScanScreen() {
  const [barcode, setBarcode] = useState("");
  const { jobs } = useJobs();

  const handleManualEntry = () => {
    if (!barcode) {
      Alert.alert("Error", "Please enter a barcode");
      return;
    }

    // Find job by order number or barcode
    const job = jobs.find(
      (j) => j.orderNumber === barcode || j.id === barcode
    );

    if (job) {
      router.replace(`/job/${job.id}` as any);
    } else {
      Alert.alert("Not Found", "No job found with this barcode");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Barcode</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <Package size={64} color="#9ca3af" />
            <Text style={styles.scanText}>Camera view would appear here</Text>
            <Text style={styles.scanHint}>
              Position barcode within the frame
            </Text>
          </View>
        </View>

        <View style={styles.manualSection}>
          <Text style={styles.orText}>OR</Text>
          <Text style={styles.manualTitle}>Enter Barcode Manually</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter barcode or order number"
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.submitButtonText}>Find Job</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccess}>
          <Text style={styles.quickAccessTitle}>Quick Access (Demo)</Text>
          <View style={styles.quickButtons}>
            {jobs.slice(0, 3).map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.quickButton}
                onPress={() => router.replace(`/job/${job.id}` as any)}
              >
                <Text style={styles.quickButtonText}>#{job.orderNumber}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scanArea: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  scanFrame: {
    height: 200,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  scanText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
  },
  scanHint: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  manualSection: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  orText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#1e40af",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  quickAccess: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
});