import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Truck, Package, Scan, CheckCircle, AlertTriangle, Boxes } from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { JobStatus } from "@/types/job";
import { mockLineItems, mockImprintMockups } from "@/mocks/jobs";

type BoxType = "Bag" | "Small" | "Large" | "XL";

interface ShipToAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
}

interface AddedBox {
  id: string;
  type: BoxType;
  weightLbs: number;
}

export default function ShippingScreen() {
  const { jobs, updateJobStatus } = useJobs();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [carrier, setCarrier] = useState<string>("ups");
  const [shippingMethod, setShippingMethod] = useState<string>("UPS Ground");
  const [billingMethod, setBillingMethod] = useState<string>("ACA Account");
  const [shipTo] = useState<ShipToAddress>({
    name: "John Doe",
    address1: "123 Main St",
    city: "Springfield",
    state: "NJ",
    zip: "07081",
  });
  const [boxType, setBoxType] = useState<BoxType>("Small");
  const [boxWeight, setBoxWeight] = useState<string>("");
  const [boxes, setBoxes] = useState<AddedBox[]>([]);

  const readyToShipJobs = jobs.filter((job) => job.status === JobStatus.READY_TO_SHIP);

  const currentJob = selectedJob ? jobs.find((j) => j.id === selectedJob) ?? null : null;

  const carriers = [
    { id: "ups", name: "UPS" },
    { id: "fedex", name: "FedEx" },
    { id: "usps", name: "USPS" },
    { id: "dhl", name: "DHL" },
    { id: "pickup", name: "Customer Pickup" },
  ];

  const lineItems = useMemo(() => {
    if (!currentJob) return [] as typeof mockLineItems;
    return mockLineItems.filter((li) => li.jobId === currentJob.id);
  }, [currentJob]);

  const thumbnails = useMemo(() => {
    if (!currentJob) return [] as typeof mockImprintMockups;
    return mockImprintMockups.filter((m) => m.jobId === currentJob.id).slice(0, 3);
  }, [currentJob]);

  const totals = useMemo(() => {
    let shirts = 0;
    let hoodies = 0;
    lineItems.forEach((li) => {
      const desc = (li.description ?? "").toLowerCase();
      const isHoodie = desc.includes("hoodie") || desc.includes("hooded") || desc.includes("sweatshirt");
      if (isHoodie) hoodies += li.quantity; else shirts += li.quantity;
    });
    return { shirts, hoodies, total: shirts + hoodies };
  }, [lineItems]);

  const estimatedBoxesNeeded = useMemo(() => {
    const boxesForShirts = Math.ceil(totals.shirts / 72 || 0);
    const boxesForHoodies = Math.ceil(totals.hoodies / 18 || 0);
    return Math.max(1, boxesForShirts + boxesForHoodies);
  }, [totals]);

  const boxCountEquivalent = useMemo(() => {
    return boxes.reduce((acc, b) => {
      if (b.type === "Bag") return acc + 0.25;
      return acc + 1;
    }, 0);
  }, [boxes]);

  const packingWarning = useMemo(() => {
    if (!currentJob) return null as string | null;
    if (boxes.length === 0) return null;
    if (boxCountEquivalent < estimatedBoxesNeeded) return "Box count does not match estimated item volume";
    return null;
  }, [boxes.length, boxCountEquivalent, estimatedBoxesNeeded, currentJob]);

  const handleAddBox = () => {
    const weightNum = Number(boxWeight);
    if (!boxWeight || Number.isNaN(weightNum)) {
      Alert.alert("Invalid weight", "Please enter a valid box weight in lbs.");
      return;
    }
    const newBox: AddedBox = {
      id: `${Date.now()}`,
      type: boxType,
      weightLbs: weightNum,
    };
    console.log("Adding box", newBox);
    setBoxes((prev) => [...prev, newBox]);
    setBoxWeight("");
  };

  const handleRemoveBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  const handleShipConfirm = () => {
    if (!currentJob) return;

    if (!trackingNumber && carrier !== "pickup") {
      Alert.alert("Error", "Please enter tracking number");
      return;
    }

    if (boxes.length === 0 && carrier !== "pickup") {
      Alert.alert("Boxes required", "Please add at least one box to proceed.");
      return;
    }

    if (packingWarning) {
      Alert.alert("Packing validation", packingWarning);
      return;
    }

    console.log("Confirming shipment", {
      jobId: currentJob.id,
      carrier,
      trackingNumber,
      shippingMethod,
      billingMethod,
      shipTo,
      boxes,
    });

    updateJobStatus(currentJob.id, JobStatus.SHIPPED);
    Alert.alert("Shipment Confirmed", `Order #${currentJob.orderNumber} has been shipped`);

    setSelectedJob(null);
    setTrackingNumber("");
    setCarrier("ups");
    setBoxes([]);
  };

  const scanForShipment = () => {
    router.push("/scan" as any);
  };

  if (!selectedJob) {
    return (
      <ScrollView style={styles.container} testID="shipping-list-screen">
        <View style={styles.header}>
          <Text style={styles.title}>Shipping Station</Text>
          <Text style={styles.subtitle}>{readyToShipJobs.length} orders ready to ship</Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={scanForShipment} testID="scan-button">
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
              testID={`job-card-${job.id}`}
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
                  {job.quantity} units • {job.boxCount ?? 1} box(es)
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

  const etaText = useMemo(() => {
    const d = currentJob?.dueDate ? new Date(currentJob.dueDate) : null;
    return d ? d.toDateString() : "TBD";
  }, [currentJob?.dueDate]);

  return (
    <ScrollView style={styles.container} testID="shipping-detail-screen">
      <View style={styles.shippingForm}>
        <View style={styles.jobInfoCard}>
          <Text style={styles.etaLabel}>Estimated Delivery</Text>
          <Text style={styles.etaValue} testID="eta-text">{etaText}</Text>

          <View style={styles.jobHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobNumber}>#{currentJob?.orderNumber}</Text>
              <Text style={styles.jobCustomer}>{currentJob?.customerName}</Text>
            </View>
            <View style={styles.mockupsRow}>
              {thumbnails.map((m) => (
                <Image key={m.id} source={{ uri: m.imageUrl }} style={styles.mockThumb} />
              ))}
            </View>
          </View>

          <View style={styles.jobStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Units</Text>
              <Text style={styles.statValue}>{totals.total}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Boxes Planned</Text>
              <Text style={styles.statValue}>{boxes.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Est. Needed</Text>
              <Text style={styles.statValue}>{estimatedBoxesNeeded}</Text>
            </View>
          </View>

          <View style={styles.addressCard}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text style={styles.addrText}>{shipTo.name}</Text>
            <Text style={styles.addrText}>{shipTo.address1}{shipTo.address2 ? `, ${shipTo.address2}` : ""}</Text>
            <Text style={styles.addrText}>{shipTo.city}, {shipTo.state} {shipTo.zip}</Text>
          </View>

          <View style={styles.methodsRow}>
            <View style={styles.methodPill}><Text style={styles.methodPillText}>{shippingMethod}</Text></View>
            <View style={styles.methodPillAlt}><Text style={styles.methodPillTextAlt}>{billingMethod}</Text></View>
          </View>
        </View>

        <View style={styles.itemsCard}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <Boxes size={18} color="#6b7280" />
          </View>
          {lineItems.map((li) => (
            <View key={li.id} style={styles.itemRow}>
              <Text style={styles.itemText}>{li.description ?? li.sku}</Text>
              <Text style={styles.itemMeta}>{li.color} / {li.size}</Text>
              <Text style={styles.itemQty}>x{li.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.boxBuilder}>
          <Text style={styles.sectionTitle}>Add Box</Text>
          <View style={styles.boxControls}>
            <View style={styles.boxTypeRow}>
              {(["Bag", "Small", "Large", "XL"] as BoxType[]).map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.boxTypeButton, boxType === bt && styles.boxTypeButtonActive]}
                  onPress={() => setBoxType(bt)}
                  testID={`box-type-${bt}`}
                >
                  <Text style={[styles.boxTypeText, boxType === bt && styles.boxTypeTextActive]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                placeholder="Weight (lbs)"
                keyboardType="numeric"
                value={boxWeight}
                onChangeText={setBoxWeight}
                testID="box-weight-input"
              />
              <TouchableOpacity style={styles.addBoxButton} onPress={handleAddBox} testID="add-box-button">
                <Text style={styles.addBoxText}>+ Add Box</Text>
              </TouchableOpacity>
            </View>
          </View>

          {boxes.length > 0 && (
            <View style={styles.boxList}>
              {boxes.map((b, idx) => (
                <View key={b.id} style={styles.boxListItem}>
                  <Text style={styles.boxListLabel}>Box {idx + 1}</Text>
                  <Text style={styles.boxListMeta}>{b.type} • {b.weightLbs.toFixed(2)} lbs</Text>
                  <TouchableOpacity onPress={() => handleRemoveBox(b.id)} testID={`remove-box-${b.id}`}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {!!packingWarning && (
            <View style={styles.warningBanner} testID="packing-warning">
              <AlertTriangle size={18} color="#b45309" />
              <Text style={styles.warningText}>{packingWarning}</Text>
            </View>
          )}
        </View>

        <View style={styles.carrierSection}>
          <Text style={styles.sectionTitle}>Select Carrier</Text>
          <View style={styles.carrierGrid}>
            {carriers.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.carrierButton, carrier === c.id && styles.carrierButtonActive]}
                onPress={() => setCarrier(c.id)}
                testID={`carrier-${c.id}`}
              >
                <Text style={[styles.carrierButtonText, carrier === c.id && styles.carrierButtonTextActive]}>
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
              testID="tracking-input"
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

        <TouchableOpacity style={styles.confirmButton} onPress={handleShipConfirm} testID="confirm-ship">
          <Truck size={20} color="white" />
          <Text style={styles.confirmButtonText}>Confirm Shipment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedJob(null)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: { padding: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6b7280" },
  scanButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#1e40af", margin: 20, padding: 16, borderRadius: 12, gap: 12 },
  scanButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  jobsList: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 16 },
  jobCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  jobCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  jobNumber: { fontSize: 16, fontWeight: "600", color: "#111827" },
  jobCustomer: { fontSize: 14, color: "#374151", marginTop: 4 },
  jobCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobMeta: { fontSize: 12, color: "#6b7280" },
  qcBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qcBadgeText: { fontSize: 11, color: "#059669", fontWeight: "600" },
  shippingForm: { padding: 20 },
  jobInfoCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  jobHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  mockupsRow: { flexDirection: "row", gap: 8 },
  mockThumb: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  etaLabel: { fontSize: 12, color: "#6b7280" },
  etaValue: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 8 },
  jobStats: { flexDirection: "row", marginTop: 16, gap: 24 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "600", color: "#111827" },
  addressCard: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  addrText: { fontSize: 14, color: "#374151" },
  methodsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  methodPill: { backgroundColor: "#111827", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  methodPillText: { color: "white", fontSize: 12, fontWeight: "600" },
  methodPillAlt: { backgroundColor: "#e5e7eb", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  methodPillTextAlt: { color: "#111827", fontSize: 12, fontWeight: "600" },
  itemsCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  itemsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  itemText: { flex: 1, fontSize: 14, color: "#111827" },
  itemMeta: { width: 140, fontSize: 12, color: "#6b7280" },
  itemQty: { width: 50, textAlign: "right", fontWeight: "600", color: "#111827" },
  boxBuilder: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  boxControls: { gap: 12 },
  boxTypeRow: { flexDirection: "row", gap: 8 },
  boxTypeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  boxTypeButtonActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  boxTypeText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  boxTypeTextActive: { color: "white" },
  weightRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  weightInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15 },
  addBoxButton: { backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8 },
  addBoxText: { color: "white", fontWeight: "700" },
  boxList: { marginTop: 8, gap: 8 },
  boxListItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  boxListLabel: { fontWeight: "700", color: "#111827" },
  boxListMeta: { color: "#374151" },
  removeText: { color: "#991b1b", fontWeight: "700" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a", padding: 10, borderRadius: 10, marginTop: 12 },
  warningText: { color: "#92400e", fontWeight: "600" },
  carrierSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  carrierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  carrierButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  carrierButtonActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  carrierButtonText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  carrierButtonTextActive: { color: "white" },
  trackingSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  trackingInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15 },
  checklistSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  checklistItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  checklistText: { fontSize: 15, color: "#374151" },
  confirmButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10b981", padding: 16, borderRadius: 12, gap: 8, marginBottom: 16 },
  confirmButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  cancelButton: { alignItems: "center", padding: 16 },
  cancelButtonText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
});