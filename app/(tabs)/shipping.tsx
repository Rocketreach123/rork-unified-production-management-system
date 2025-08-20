import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { router } from "expo-router";
import { Truck, Package, Scan, CheckCircle, AlertTriangle, Boxes, Printer, FileText } from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { JobStatus } from "@/types/job";
import { mockLineItems, mockImprintMockups } from "@/mocks/jobs";
import Svg, { Path } from "react-native-svg";

// Shipping types

type BoxType = "Bag" | "Small" | "Large" | "XL";

type CarrierId = "ups" | "fedex" | "usps" | "dhl" | "pickup";

type ServiceLevel =
  | "ups_ground"
  | "ups_2day"
  | "ups_next_day_air"
  | "fedex_ground"
  | "fedex_2day"
  | "usps_priority"
  | "dhl_express"
  | "pickup_local";

interface Dimensions {
  length: number;
  width: number;
  height: number;
}

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
  carrier?: CarrierId;
  serviceLevel?: ServiceLevel;
  trackingNumber?: string;
  labelUrl?: string;
  labelGenerated?: boolean;
  labelPrinted?: boolean;
  dimensions?: Dimensions;
}

interface SignatureData {
  firstName: string;
  lastName: string;
  strokesPath: string; // serialized SVG path for signature
}

function SignaturePad({ onChange }: { onChange: (path: string) => void }) {
  const [path, setPath] = useState<string>("");
  const dRef = useRef<string>("");
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        dRef.current += ` M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPath(dRef.current);
        onChange(dRef.current);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { moveX, moveY } = gestureState as unknown as { moveX: number; moveY: number };
        if (Number.isFinite(moveX) && Number.isFinite(moveY)) {
          dRef.current += ` L ${moveX.toFixed(1)} ${moveY.toFixed(1)}`;
          setPath(dRef.current);
          onChange(dRef.current);
        }
      },
      onPanResponderRelease: () => {
        // end of stroke
      },
    })
  ).current;

  const clear = () => {
    dRef.current = "";
    setPath("");
    onChange("");
  };

  return (
    <View style={styles.signatureContainer} {...panResponder.panHandlers} testID="signature-pad">
      <Svg width="100%" height="100%">
        <Path d={path} stroke="#111827" strokeWidth={2} fill="none" />
      </Svg>
      <TouchableOpacity style={styles.signatureClear} onPress={clear} testID="signature-clear">
        <Text style={styles.signatureClearText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ShippingScreen() {
  const { jobs, updateJobStatus } = useJobs();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [carrier, setCarrier] = useState<CarrierId>("ups");
  const [shippingMethod] = useState<string>("UPS Ground");
  const [billingMethod] = useState<string>("ACA Account");
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
  const [pickupSignature, setPickupSignature] = useState<SignatureData>({ firstName: "", lastName: "", strokesPath: "" });

  const readyToShipJobs = jobs.filter((job) => job.status === JobStatus.READY_TO_SHIP);

  const currentJob = selectedJob ? jobs.find((j) => j.id === selectedJob) ?? null : null;

  const carriers = [
    { id: "ups" as CarrierId, name: "UPS" },
    { id: "fedex" as CarrierId, name: "FedEx" },
    { id: "usps" as CarrierId, name: "USPS" },
    { id: "dhl" as CarrierId, name: "DHL" },
    { id: "pickup" as CarrierId, name: "Customer Pickup" },
  ];

  const serviceOptions: Record<Exclude<CarrierId, "pickup">, { id: ServiceLevel; name: string }[]> = {
    ups: [
      { id: "ups_ground", name: "UPS Ground" },
      { id: "ups_2day", name: "UPS 2nd Day Air" },
      { id: "ups_next_day_air", name: "UPS Next Day Air" },
    ],
    fedex: [
      { id: "fedex_ground", name: "FedEx Ground" },
      { id: "fedex_2day", name: "FedEx 2Day" },
    ],
    usps: [
      { id: "usps_priority", name: "USPS Priority" },
    ],
    dhl: [
      { id: "dhl_express", name: "DHL Express" },
    ],
  };

  const lineItems = useMemo(() => {
    if (!currentJob) return [] as typeof mockLineItems;
    return mockLineItems.filter((li) => li.jobId === currentJob.id);
  }, [currentJob]);

  const thumbnails = useMemo(() => {
    if (!currentJob) return [] as typeof mockImprintMockups;
    return mockImprintMockups.filter((m) => m.jobId === currentJob.id).slice(0, 3);
  }, [currentJob]);

  const etaText = useMemo(() => {
    const d = currentJob?.dueDate ? new Date(currentJob.dueDate) : null;
    return d ? d.toDateString() : "TBD";
  }, [currentJob?.dueDate]);

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
    const defaultCarrier: CarrierId = carrier;
    const defaultService: ServiceLevel | undefined = defaultCarrier === "pickup" ? undefined : serviceOptions[defaultCarrier]?.[0]?.id;
    const newBox: AddedBox = {
      id: `${Date.now()}`,
      type: boxType,
      weightLbs: weightNum,
      carrier: defaultCarrier === "pickup" ? undefined : defaultCarrier,
      serviceLevel: defaultService,
      labelGenerated: false,
      labelPrinted: false,
      dimensions: { length: 12, width: 10, height: 8 },
    };
    console.log("Adding box", newBox);
    setBoxes((prev) => [...prev, newBox]);
    setBoxWeight("");
  };

  const handleRemoveBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBox = (id: string, partial: Partial<AddedBox>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...partial } : b)));
  };

  const mockGenerateLabel = async (b: AddedBox) => {
    if (!b.dimensions || !b.carrier || !b.serviceLevel) {
      Alert.alert("Missing details", "Please set carrier, service and dimensions.");
      return;
    }
    console.log("Generating label for box", b);
    await new Promise((r) => setTimeout(r, 400));
    const tracking = `${(b.carrier ?? "ups").toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const dummyPdf = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    updateBox(b.id, {
      trackingNumber: tracking,
      labelUrl: dummyPdf,
      labelGenerated: true,
    });
  };

  const scanForShipment = () => {
    router.push("/scan" as any);
  };

  const validateBeforeConfirm = () => {
    if (!currentJob) return false;

    if (carrier !== "pickup") {
      if (boxes.length === 0) {
        Alert.alert("Boxes required", "Please add at least one box to proceed.");
        return false;
      }
      const missingLabels = boxes.some((b) => !b.labelGenerated);
      if (missingLabels) {
        Alert.alert("Labels missing", "Please generate labels for all boxes.");
        return false;
      }
    } else {
      if (!pickupSignature.firstName || !pickupSignature.lastName || !pickupSignature.strokesPath) {
        Alert.alert("Signature required", "Please capture pickup signature and name.");
        return false;
      }
    }

    if (packingWarning) {
      Alert.alert("Packing validation", packingWarning);
      return false;
    }

    return true;
  };

  const handleShipConfirm = () => {
    if (!currentJob) return;
    if (!validateBeforeConfirm()) return;

    console.log("Confirming shipment", {
      jobId: currentJob.id,
      carrier,
      trackingNumber,
      shippingMethod,
      billingMethod,
      shipTo,
      boxes,
      pickupSignature: carrier === "pickup" ? pickupSignature : undefined,
    });

    updateJobStatus(currentJob.id, JobStatus.SHIPPED);
    Alert.alert("Shipment Confirmed", `Order #${currentJob.orderNumber} has been shipped`);

    setSelectedJob(null);
    setTrackingNumber("");
    setCarrier("ups");
    setBoxes([]);
    setPickupSignature({ firstName: "", lastName: "", strokesPath: "" });
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
              {["Bag", "Small", "Large", "XL"].map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.boxTypeButton, boxType === bt && styles.boxTypeButtonActive]}
                  onPress={() => setBoxType(bt as BoxType)}
                  testID={`box-type-${bt}`}
                >
                  <Text style={[styles.boxTypeText, boxType === (bt as BoxType) && styles.boxTypeTextActive]}>{bt}</Text>
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boxListLabel}>Box {idx + 1}</Text>
                    <Text style={styles.boxListMeta}>{b.type} • {b.weightLbs.toFixed(2)} lbs</Text>

                    {carrier !== "pickup" ? (
                      <View style={styles.labelSection}>
                        <Text style={styles.labelTitle}>Label</Text>
                        <View style={styles.inlineRow}>
                          <Text style={styles.inlineLabel}>Carrier</Text>
                          <View style={styles.carrierGrid}>
                            {["ups","fedex","usps","dhl"].map((cid) => (
                              <TouchableOpacity
                                key={cid}
                                style={[styles.carrierButtonSmall, b.carrier === cid && styles.carrierButtonActive]}
                                onPress={() => updateBox(b.id, { carrier: cid as CarrierId, serviceLevel: serviceOptions[cid as Exclude<CarrierId,"pickup">][0]?.id })}
                                testID={`box-${b.id}-carrier-${cid}`}
                              >
                                <Text style={[styles.carrierButtonText, b.carrier === cid && styles.carrierButtonTextActive]}>{cid.toUpperCase()}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {!!b.carrier && b.carrier !== "pickup" && (
                          <View style={styles.inlineRow}>
                            <Text style={styles.inlineLabel}>Service</Text>
                            <View style={styles.serviceRow}>
                              {serviceOptions[b.carrier as Exclude<CarrierId, "pickup">]?.map((s) => (
                                <TouchableOpacity
                                  key={s.id}
                                  style={[styles.serviceButton, b.serviceLevel === s.id && styles.serviceButtonActive]}
                                  onPress={() => updateBox(b.id, { serviceLevel: s.id })}
                                  testID={`box-${b.id}-service-${s.id}`}
                                >
                                  <Text style={[styles.serviceText, b.serviceLevel === s.id && styles.serviceTextActive]}>{s.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                        <View style={styles.dimensionsRow}>
                          <Text style={styles.inlineLabel}>Dims (in)</Text>
                          <TextInput
                            style={styles.dimInput}
                            keyboardType="numeric"
                            placeholder="L"
                            value={(b.dimensions?.length ?? 0).toString()}
                            onChangeText={(t) => updateBox(b.id, { dimensions: { ...(b.dimensions ?? { length: 0, width: 0, height: 0 }), length: Number(t) || 0 } })}
                            testID={`box-${b.id}-dim-l`}
                          />
                          <TextInput
                            style={styles.dimInput}
                            keyboardType="numeric"
                            placeholder="W"
                            value={(b.dimensions?.width ?? 0).toString()}
                            onChangeText={(t) => updateBox(b.id, { dimensions: { ...(b.dimensions ?? { length: 0, width: 0, height: 0 }), width: Number(t) || 0 } })}
                            testID={`box-${b.id}-dim-w`}
                          />
                          <TextInput
                            style={styles.dimInput}
                            keyboardType="numeric"
                            placeholder="H"
                            value={(b.dimensions?.height ?? 0).toString()}
                            onChangeText={(t) => updateBox(b.id, { dimensions: { ...(b.dimensions ?? { length: 0, width: 0, height: 0 }), height: Number(t) || 0 } })}
                            testID={`box-${b.id}-dim-h`}
                          />
                        </View>

                        <View style={styles.labelActionsRow}>
                          {!b.labelGenerated ? (
                            <TouchableOpacity style={styles.generateLabelButton} onPress={() => mockGenerateLabel(b)} testID={`gen-label-${b.id}`}>
                              <Printer size={16} color="white" />
                              <Text style={styles.generateLabelText}>Generate Label</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.generatedRow}>
                              <FileText size={16} color="#065f46" />
                              <TouchableOpacity onPress={() => b.labelUrl && router.push(b.labelUrl as any)} testID={`open-label-${b.id}`}>
                                <Text style={styles.labelLink}>Open Label PDF</Text>
                              </TouchableOpacity>
                              <Text style={styles.trackingText}>• {b.trackingNumber}</Text>
                              <TouchableOpacity
                                style={[styles.printToggle, b.labelPrinted && styles.printToggleOn]}
                                onPress={() => updateBox(b.id, { labelPrinted: !b.labelPrinted })}
                                testID={`printed-toggle-${b.id}`}
                              >
                                <Text style={[styles.printToggleText, b.labelPrinted && styles.printToggleTextOn]}>{b.labelPrinted ? "Printed" : "Mark Printed"}</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.pickupBadge}><Text style={styles.pickupBadgeText}>Pickup - No label needed</Text></View>
                    )}
                  </View>

                  <View style={{ gap: 8, alignItems: "flex-end" }}>
                    <TouchableOpacity onPress={() => handleRemoveBox(b.id)} testID={`remove-box-${b.id}`}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
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
          <Text style={styles.sectionTitle}>Select Shipment Type</Text>
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
            <Text style={styles.sectionTitle}>Tracking Number (optional)</Text>
            <TextInput
              style={styles.trackingInput}
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              testID="tracking-input"
            />
          </View>
        )}

        {carrier === "pickup" && (
          <View style={styles.signatureSection} testID="pickup-signature-section">
            <Text style={styles.sectionTitle}>Pickup Signature</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.nameInput, { marginRight: 8 }]}
                placeholder="First Name"
                value={pickupSignature.firstName}
                onChangeText={(t) => setPickupSignature((p) => ({ ...p, firstName: t }))}
                testID="pickup-first-name"
              />
              <TextInput
                style={styles.nameInput}
                placeholder="Last Name"
                value={pickupSignature.lastName}
                onChangeText={(t) => setPickupSignature((p) => ({ ...p, lastName: t }))}
                testID="pickup-last-name"
              />
            </View>
            <SignaturePad onChange={(path) => setPickupSignature((p) => ({ ...p, strokesPath: path }))} />
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
  boxListItem: { gap: 10, backgroundColor: "#f9fafb", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  boxListLabel: { fontWeight: "700", color: "#111827" },
  boxListMeta: { color: "#374151", marginBottom: 8 },
  removeText: { color: "#991b1b", fontWeight: "700" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a", padding: 10, borderRadius: 10, marginTop: 12 },
  warningText: { color: "#92400e", fontWeight: "600" },
  carrierSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  carrierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  carrierButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  carrierButtonSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
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
  // Label section styles
  labelSection: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, gap: 10 },
  labelTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineLabel: { color: "#6b7280", width: 82, fontSize: 12 },
  serviceRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  serviceButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  serviceText: { fontSize: 12, color: "#374151" },
  serviceTextActive: { color: "#fff" },
  dimensionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dimInput: { width: 60, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 8 },
  labelActionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  generateLabelButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1e40af", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  generateLabelText: { color: "#fff", fontWeight: "700" },
  generatedRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  labelLink: { color: "#065f46", fontWeight: "700" },
  trackingText: { color: "#374151" },
  printToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f3f4f6" },
  printToggleOn: { backgroundColor: "#10b981" },
  printToggleText: { color: "#111827", fontWeight: "700" },
  printToggleTextOn: { color: "#fff" },
  pickupBadge: { alignSelf: "flex-start", backgroundColor: "#e0f2fe", borderColor: "#bae6fd", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pickupBadgeText: { color: "#075985", fontWeight: "600" },
  // Signature
  signatureSection: { backgroundColor: "#fff", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 20 },
  signatureContainer: { height: 140, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, overflow: "hidden", marginTop: 8, backgroundColor: "#fff" },
  signatureClear: { position: "absolute", right: 10, bottom: 10, backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#e5e7eb" },
  signatureClearText: { color: "#111827", fontWeight: "700" },
  nameInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15 },
});