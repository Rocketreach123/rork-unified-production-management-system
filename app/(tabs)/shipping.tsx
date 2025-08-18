import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Truck, Package, Scan, CheckCircle } from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { JobStatus } from "@/types/job";

export default function ShippingScreen() {
  const { jobs, updateJobStatus } = useJobs();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState<string>("ups");

  const readyToShipJobs = jobs.filter(
    (job) => job.status === JobStatus.READY_TO_SHIP
  );

  const currentJob = selectedJob
    ? jobs.find((j) => j.id === selectedJob)
    : null;

  const carriers = [
    { id: "ups", name: "UPS" },
    { id: "fedex", name: "FedEx" },
    { id: "usps", name: "USPS" },
    { id: "dhl", name: "DHL" },
    { id: "pickup", name: "Customer Pickup" },
  ];

  const handleShipConfirm = () => {
    if (!currentJob) return;

    if (!trackingNumber && carrier !== "pickup") {
      Alert.alert("Error", "Please enter tracking number");
      return;
    }

    updateJobStatus(currentJob.id, JobStatus.SHIPPED);
    Alert.alert(
      "Shipment Confirmed",
      `Order #${currentJob.orderNumber} has been shipped`
    );

    // Reset form
    setSelectedJob(null);
    setTrackingNumber("");
    setCarrier("ups");
  };

  const scanForShipment = () => {
    router.push("/scan" as any);
  };

  if (!selectedJob) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shipping Station</Text>
          <Text style={styles.subtitle}>
            {readyToShipJobs.length} orders ready to ship
          </Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={scanForShipment}>
          <Scan size={24} color="white" />
          <Text style={styles.scanButtonText}>Scan Package Label</Text>
        </TouchableOpacity>

        <View style={styles.jobsList}>
          <Text style={styles.sectionTitle}>Ready to Ship</Text>
          {readyToShipJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => setSelectedJob(job.id)}
            >
              <View style={styles.jobCardHeader}>
                <View>
                  <Text style={styles.jobNumber}>#{job.orderNumber}</Text>
                  <Text style={styles.jobCustomer}>{job.customerName}</Text>
                </View>
                <Package size={24} color="#6b7280" />
              </View>
              <View style={styles.jobCardFooter}>
                <Text style={styles.jobMeta}>
                  {job.quantity} units • {job.boxCount || 1} box(es)
                </Text>
                <View style={styles.qcBadge}>
                  <CheckCircle size={12} color="#10b981" />
                  <Text style={styles.qcBadgeText}>QC Passed</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.shippingForm}>
        <View style={styles.jobInfoCard}>
          <Text style={styles.jobNumber}>#{currentJob?.orderNumber}</Text>
          <Text style={styles.jobCustomer}>{currentJob?.customerName}</Text>
          <View style={styles.jobStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Units</Text>
              <Text style={styles.statValue}>{currentJob?.quantity}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Boxes</Text>
              <Text style={styles.statValue}>{currentJob?.boxCount || 1}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>
                {currentJob?.weight || "5.2"} lbs
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.carrierSection}>
          <Text style={styles.sectionTitle}>Select Carrier</Text>
          <View style={styles.carrierGrid}>
            {carriers.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.carrierButton,
                  carrier === c.id && styles.carrierButtonActive,
                ]}
                onPress={() => setCarrier(c.id)}
              >
                <Text
                  style={[
                    styles.carrierButtonText,
                    carrier === c.id && styles.carrierButtonTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {carrier !== "pickup" && (
          <View style={styles.trackingSection}>
            <Text style={styles.sectionTitle}>Tracking Number</Text>
            <TextInput
              style={styles.trackingInput}
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
            />
          </View>
        )}

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>Pre-Ship Checklist</Text>
          <View style={styles.checklistItem}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.checklistText}>QC Approved</Text>
          </View>
          <View style={styles.checklistItem}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.checklistText}>Labels Generated</Text>
          </View>
          <View style={styles.checklistItem}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.checklistText}>Packaging Complete</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleShipConfirm}
        >
          <Truck size={20} color="white" />
          <Text style={styles.confirmButtonText}>Confirm Shipment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setSelectedJob(null)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  scanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  jobsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  jobCustomer: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  qcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qcBadgeText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },
  shippingForm: {
    padding: 20,
  },
  jobInfoCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobStats: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  carrierSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  carrierGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  carrierButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  carrierButtonActive: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  carrierButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  carrierButtonTextActive: {
    color: "white",
  },
  trackingSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  trackingInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  checklistSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  checklistText: {
    fontSize: 15,
    color: "#374151",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    padding: 16,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "500",
  },
});