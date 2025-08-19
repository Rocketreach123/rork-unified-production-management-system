import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  Modal,
} from "react-native";
import { router } from "expo-router";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Scan,
  Grid,
  Palette,
  PackageCheck,
} from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { JobStatus } from "@/types/job";
import { trpc } from "@/lib/trpc";
import type { QCStatus, QCService, QCPhase } from "@/types/qc";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImprintDisplay } from "@/components/ImprintDisplay";
import { mockLineItems } from "@/mocks/jobs";

interface SpoilageEntry {
  id: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  reason: string;
}

interface ChecklistItem { id: string; label: string; icon: React.ReactElement; checked: boolean }

const serviceOptions: QCService[] = [
  "Screen Printing",
  "Embroidery",
  "DTG",
  "Transfers",
  "Full Order",
];

const failReasonOptions: string[] = [
  "Damaged in production",
  "Failed QC",
  "Missing from check-in",
  "Color off",
  "Blurry",
];

export default function QCScreen() {
  const { jobs, updateJobStatus } = useJobs();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [qcMode, setQcMode] = useState<"live" | "recheck">("live");
  const [notes, setNotes] = useState<string>("");
  const [services, setServices] = useState<QCService[]>([]);
  const [missingCount, setMissingCount] = useState<string>("0"); // deprecated manual input, will be derived from spoilageEntries
  const [failReasons, setFailReasons] = useState<string[]>([]);
  const [status, setStatus] = useState<QCStatus>("Recheck Needed");
  const [goodPhotoUrl, setGoodPhotoUrl] = useState<string>("");
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>("");
  const [correctionsPhotoUrl, setCorrectionsPhotoUrl] = useState<string>("");
  const [labelsPhotoUrl, setLabelsPhotoUrl] = useState<string>("");
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [cameraPhase, setCameraPhase] = useState<QCPhase | null>(null);
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [discrepancy, setDiscrepancy] = useState<string>("");
  const [fixesNotes, setFixesNotes] = useState<string>("");

  const [spoilageEntries, setSpoilageEntries] = useState<SpoilageEntry[]>([]);
  const [spoilageEditorOpen, setSpoilageEditorOpen] = useState<boolean>(false);
  const [draftSpoilage, setDraftSpoilage] = useState<{ sku: string; size: string; color: string; quantity: string; reason: string }>({ sku: "", size: "", color: "", quantity: "1", reason: "Failed QC" });

  const [guideVisible, setGuideVisible] = useState<boolean>(false);
  const [guideFor, setGuideFor] = useState<string | null>(null);

  const qcPendingJobs = useMemo(() => jobs.filter(
    (job) => job.status === JobStatus.QC_PENDING || job.status === JobStatus.QC_FAILED
  ), [jobs]);

  const currentJob = selectedJob ? jobs.find((j) => j.id === selectedJob) ?? null : null;

  const initialChecklist: ChecklistItem[] = [
    { id: "alignment", label: "Alignment correct", icon: <Grid size={18} color="#111827" />, checked: false },
    { id: "placement", label: "Placement accurate", icon: <CheckCircle size={18} color="#111827" />, checked: false },
    { id: "colors", label: "Colors match proof", icon: <Palette size={18} color="#111827" />, checked: false },
    { id: "quality", label: "Print quality acceptable", icon: <CheckCircle size={18} color="#111827" />, checked: false },
    { id: "packaging", label: "Packaging intact", icon: <PackageCheck size={18} color="#111827" />, checked: false },
  ];

  const [checklistState, setChecklistState] = useState<ChecklistItem[]>([...initialChecklist]);

  const openGuideFor = useCallback((id: string) => {
    console.log("Open guide for", id);
    setGuideFor(id);
    setGuideVisible(true);
  }, []);

  const applyGuideAndToggle = useCallback((id: string) => {
    console.log("Apply guide and mark verified", id);
    setChecklistState((prev) => prev.map((item) => item.id === id ? { ...item, checked: true } : item));
    setGuideVisible(false);
    setGuideFor(null);
  }, []);

  const toggleChecklistItem = (id: string) => {
    const found = checklistState.find((i) => i.id === id);
    if (found && !found.checked) {
      openGuideFor(id);
      return;
    }
    setChecklistState((prev) => prev.map((item) => item.id === id ? { ...item, checked: false } : item));
  };

  const startCameraForPhase = async (phase: QCPhase) => {
    console.log("Request camera for phase", phase);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera Access", "Camera permission is required to capture photos.");
        return;
      }
    }
    setCameraPhase(phase);
    setCameraVisible(true);
  };

  const handleTakePicture = async () => {
    try {
      const cam = cameraRef.current;
      if (!cam) {
        Alert.alert("Camera", "Camera not ready. Please try again.");
        return;
      }
      const photo = await cam.takePictureAsync({ base64: true, skipProcessing: Platform.OS === "android" });
      const dataUrl = `data:image/jpeg;base64,${photo?.base64 ?? ""}`;
      if (!cameraPhase) return;
      if (cameraPhase === "Good Piece") setGoodPhotoUrl(dataUrl);
      if (cameraPhase === "Failed Pieces") setFailedPhotoUrl(dataUrl);
      if (cameraPhase === "Corrections") setCorrectionsPhotoUrl(dataUrl);
      if (cameraPhase === "Box Labels") setLabelsPhotoUrl(dataUrl);
      setCameraVisible(false);
      setCameraPhase(null);
    } catch (e) {
      console.log("takePicture error", e);
      Alert.alert("Camera Error", "Failed to take photo. Please try again.");
    }
  };

  const toggleService = (svc: QCService) => {
    setServices((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]);
  };

  const toggleFailReason = (r: string) => {
    setFailReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const createFormMutation = trpc.qc.createForm.useMutation();
  const uploadFileMutation = trpc.qc.uploadFile.useMutation();

  const handleSubmitQC = async (decision: "pass" | "fail" | "hold") => {
    if (!currentJob) return;

    const decidedStatus: QCStatus = decision === "pass" ? "Pass" : decision === "fail" ? "Fail" : "Hold";

    try {
      const form = await createFormMutation.mutateAsync({
        order_number: currentJob.orderNumber,
        inspector_id: Number(currentJob.qcInspectorId ?? 0),
        services_checked: services.length ? services : ["Full Order"],
        design_check: checklistState.filter((c) => !c.checked).map((c) => c.label).join(", "),
        missing_count: spoilageEntries.reduce((sum, e) => sum + (e.quantity || 0), 0),
        fail_reasons: failReasons,
        status: decidedStatus,
        discrepancy_summary: [
          discrepancy,
          spoilageEntries.length ? "\nSpoilage Log:\n" + spoilageEntries.map((e) => `${e.quantity} ${e.size} ${e.color} – ${e.reason} (${e.sku})`).join("\n") : "",
        ].filter(Boolean).join("\n").trim(),
        fixes_notes: fixesNotes,
        comments: notes,
      });

      const uploads: Array<{ url: string; phase: QCPhase }> = [];
      if (goodPhotoUrl) uploads.push({ url: goodPhotoUrl, phase: "Good Piece" });
      if (failedPhotoUrl) uploads.push({ url: failedPhotoUrl, phase: "Failed Pieces" });
      if (correctionsPhotoUrl) uploads.push({ url: correctionsPhotoUrl, phase: "Corrections" });
      if (labelsPhotoUrl) uploads.push({ url: labelsPhotoUrl, phase: "Box Labels" });

      for (const u of uploads) {
        try {
          await uploadFileMutation.mutateAsync({
            qc_form_id: form.id,
            phase: u.phase,
            file_path: u.url,
            uploaded_by: Number(currentJob.qcInspectorId ?? 0),
          });
        } catch (err) {
          console.log("Upload file error", err);
        }
      }

      let newStatus: JobStatus = JobStatus.QC_PENDING;
      let msg = "";
      if (decision === "pass") {
        newStatus = JobStatus.READY_TO_SHIP;
        msg = "Job passed QC and is ready to ship";
      } else if (decision === "fail") {
        newStatus = JobStatus.QC_FAILED;
        msg = "Job failed QC and needs rework";
      } else {
        newStatus = JobStatus.QC_PENDING;
        msg = "Job placed on hold for review";
      }
      updateJobStatus(currentJob.id, newStatus);
      Alert.alert("QC Recorded", msg);

      setSelectedJob(null);
      setNotes("");
      setChecklistState([...initialChecklist]);
      setServices([]);
      setMissingCount("0");
      setFailReasons([]);
      setStatus("Recheck Needed");
      setGoodPhotoUrl("");
      setFailedPhotoUrl("");
      setCorrectionsPhotoUrl("");
      setLabelsPhotoUrl("");
      setDiscrepancy("");
      setFixesNotes("");
      setSpoilageEntries([]);
    } catch (e) {
      Alert.alert("Error", "Failed to record QC. Please try again.");
      console.log("QC submit error", e);
    }
  };

  const scanForJob = () => {
    router.push("/scan" as any);
  };

  if (!selectedJob) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quality Control</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, qcMode === "live" ? styles.modeButtonActive : undefined]}
              onPress={() => setQcMode("live")}
              testID="qc-mode-live"
            >
              <Text style={[styles.modeButtonText, qcMode === "live" ? styles.modeButtonTextActive : undefined]}>Live QC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, qcMode === "recheck" ? styles.modeButtonActive : undefined]}
              onPress={() => setQcMode("recheck")}
              testID="qc-mode-recheck"
            >
              <Text style={[styles.modeButtonText, qcMode === "recheck" ? styles.modeButtonTextActive : undefined]}>Recheck</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={scanForJob} testID="scan-job-btn">
          <Scan size={24} color="white" />
          <Text style={styles.scanButtonText}>Scan Job for QC</Text>
        </TouchableOpacity>

        <View style={styles.jobsList}>
          <Text style={styles.sectionTitle}>Pending QC</Text>
          {qcPendingJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => setSelectedJob(job.id)}
              testID={`qc-job-${job.id}`}
            >
              <View style={styles.jobCardHeader}>
                <Text style={styles.jobNumber}>#{job.orderNumber}</Text>
                <Text style={styles.jobCustomer}>{job.customerName}</Text>
              </View>
              <Text style={styles.jobMeta}>
                {job.department} • {job.quantity} units
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  const checklistScore = checklistState.filter((c) => c.checked).length;
  const hasIssues = spoilageEntries.reduce((s, e) => s + e.quantity, 0) > 0 || failReasons.length > 0 || (notes.trim().length > 0 && checklistScore < checklistState.length);
  const bannerColor = checklistScore === checklistState.length && !hasIssues ? "#10b981" : hasIssues ? "#ef4444" : "#f59e0b";
  const bannerLabel = checklistScore === checklistState.length && !hasIssues ? "All validations complete – Ready to Pass" : hasIssues ? "Issues found – Review required" : "Some items unchecked – Recheck Needed";

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.banner, { backgroundColor: bannerColor }]} testID="qc-status-banner">
        <Text style={styles.bannerText}>{bannerLabel}</Text>
      </View>

      {currentJob?.id ? <ImprintDisplay jobId={currentJob.id} /> : null}

      <View style={styles.qcForm}>
        <View style={styles.jobInfoCard}>
          <Text style={styles.jobNumber}>#{currentJob?.orderNumber}</Text>
          <Text style={styles.jobCustomer}>{currentJob?.customerName}</Text>
          <Text style={styles.jobMeta}>
            {currentJob?.department} • {currentJob?.quantity} units
          </Text>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>Garment Size Run</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mockLineItems.filter((li) => li.jobId === (currentJob?.id ?? "")).map((li) => (
              <View key={li.id} style={styles.sizeChip}>
                <Text style={styles.sizeChipSku}>{li.sku}</Text>
                <Text style={styles.sizeChipText}>{li.color} • {li.size}</Text>
                <Text style={styles.sizeChipQty}>{li.quantity} pcs</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>QC Checklist</Text>
          {checklistState.map((item) => (
            <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)} testID={`qc-check-${item.id}`}>
              <View style={styles.checkbox}>
                {item.checked ? <CheckCircle size={20} color="#10b981" /> : <View style={styles.checkboxEmpty} />}
              </View>
              <View style={styles.checklistIcon}>{item.icon}</View>
              <Text style={styles.checklistLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Design Issues / Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Only add notes if necessary"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="qc-notes"
          />
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Failed / Missing Pieces</Text>

          <View style={styles.spoilageHeaderRow}>
            <Text style={styles.spoilageTotal}>Total: {spoilageEntries.reduce((s, e) => s + (e.quantity || 0), 0)} pcs</Text>
            <TouchableOpacity style={styles.addSpoilageBtn} onPress={() => {
              const first = mockLineItems.find(li => li.jobId === (currentJob?.id ?? ""));
              setDraftSpoilage({
                sku: first?.sku ?? "",
                size: first?.size ?? "",
                color: first?.color ?? "",
                quantity: "1",
                reason: "Failed QC",
              });
              setSpoilageEditorOpen(true);
            }} testID="add-spoilage">
              <Text style={styles.addSpoilageText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          {spoilageEntries.length > 0 ? (
            <View style={styles.spoilageList}>
              {spoilageEntries.map((e) => (
                <View key={e.id} style={styles.spoilageItem}>
                  <Text style={styles.spoilageText}>{e.quantity} {e.size} {e.color} – {e.reason}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.spoilageSku}>{e.sku}</Text>
                    <TouchableOpacity onPress={() => setSpoilageEntries(prev => prev.filter(x => x.id !== e.id))} testID={`remove-spoilage-${e.id}`}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.spoilageEmpty}>No spoilage recorded yet.</Text>
          )}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Capture Photos</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={() => startCameraForPhase("Good Piece")} testID="photo-btn-good">
              <Camera size={18} color="#1e40af" />
              <Text style={styles.photoButtonText}>Good Piece</Text>
            </TouchableOpacity>
            {goodPhotoUrl ? <Image source={{ uri: goodPhotoUrl }} style={styles.preview} /> : null}
          </View>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={() => startCameraForPhase("Failed Pieces")} testID="photo-btn-failed">
              <Camera size={18} color="#1e40af" />
              <Text style={styles.photoButtonText}>Failed Pieces</Text>
            </TouchableOpacity>
            {failedPhotoUrl ? <Image source={{ uri: failedPhotoUrl }} style={styles.preview} /> : null}
          </View>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={() => startCameraForPhase("Corrections")} testID="photo-btn-corrections">
              <Camera size={18} color="#1e40af" />
              <Text style={styles.photoButtonText}>Corrections</Text>
            </TouchableOpacity>
            {correctionsPhotoUrl ? <Image source={{ uri: correctionsPhotoUrl }} style={styles.preview} /> : null}
          </View>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={() => startCameraForPhase("Box Labels")} testID="photo-btn-labels">
              <Camera size={18} color="#1e40af" />
              <Text style={styles.photoButtonText}>Labels & Boxes</Text>
            </TouchableOpacity>
            {labelsPhotoUrl ? <Image source={{ uri: labelsPhotoUrl }} style={styles.preview} /> : null}
          </View>
        </View>

        <View style={styles.decisionButtons}>
          <TouchableOpacity style={[styles.decisionButton, styles.passButton]} onPress={() => handleSubmitQC("pass")} testID="qc-pass">
            <CheckCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.decisionButton, styles.holdButton]} onPress={() => handleSubmitQC("hold")} testID="qc-hold">
            <AlertCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Hold</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.decisionButton, styles.failButton]} onPress={() => handleSubmitQC("fail")} testID="qc-fail">
            <XCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Fail</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedJob(null)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {guideVisible && (
        <Modal transparent animationType="fade" visible={guideVisible} onRequestClose={() => setGuideVisible(false)}>
          <View style={styles.guideOverlay}>
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>{guideFor === 'alignment' ? 'Alignment Check' : guideFor === 'placement' ? 'Placement Check' : guideFor === 'colors' ? 'Color Match' : guideFor === 'quality' ? 'Print Quality' : 'Packaging'}</Text>
              <Image source={{ uri: guideFor === 'alignment' ? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200&auto=format&fit=crop' : guideFor === 'placement' ? 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop' : guideFor === 'colors' ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop' : guideFor === 'quality' ? 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1200&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop' }} style={styles.guideImage} resizeMode="cover" />
              <View style={styles.guideSteps}>
                {guideFor === 'alignment' && (
                  <>
                    <Text style={styles.guideStep}>• Lay garment flat; smooth wrinkles</Text>
                    <Text style={styles.guideStep}>• Use centerline grid; verify left/right balance</Text>
                    <Text style={styles.guideStep}>• Confirm distance from collar according to mockup</Text>
                  </>
                )}
                {guideFor === 'placement' && (
                  <>
                    <Text style={styles.guideStep}>• Match imprint zone to mockup position</Text>
                    <Text style={styles.guideStep}>• Sleeve/pocket prints: verify angle and offset</Text>
                    <Text style={styles.guideStep}>• Confirm scale within tolerance</Text>
                  </>
                )}
                {guideFor === 'colors' && (
                  <>
                    <Text style={styles.guideStep}>• Compare ink to approved swatch</Text>
                    <Text style={styles.guideStep}>• Under different light: shop vs daylight</Text>
                    <Text style={styles.guideStep}>• Note Pantone if mismatch</Text>
                  </>
                )}
                {guideFor === 'quality' && (
                  <>
                    <Text style={styles.guideStep}>• Inspect for pinholes, ghosting, cracking</Text>
                    <Text style={styles.guideStep}>• Check coverage on dark garments</Text>
                    <Text style={styles.guideStep}>• Tug test for cure integrity</Text>
                  </>
                )}
                {guideFor === 'packaging' && (
                  <>
                    <Text style={styles.guideStep}>• Verify fold method per job</Text>
                    <Text style={styles.guideStep}>• Bag/tag present as required</Text>
                    <Text style={styles.guideStep}>• Box labels: SKU, size, qty match</Text>
                  </>
                )}
              </View>
              <View style={styles.guideActions}>
                <TouchableOpacity style={[styles.controlBtn]} onPress={() => { setGuideVisible(false); setGuideFor(null); }} testID="guide-cancel">
                  <Text style={styles.controlBtnText}>Close</Text>
                </TouchableOpacity>
                {guideFor ? (
                  <TouchableOpacity style={[styles.controlBtn, styles.controlPrimary]} onPress={() => applyGuideAndToggle(guideFor!)} testID="guide-confirm">
                    <Text style={[styles.controlBtnText, styles.controlPrimaryText]}>Mark as Verified</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {spoilageEditorOpen && (
        <Modal transparent animationType="slide" visible={spoilageEditorOpen} onRequestClose={() => setSpoilageEditorOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Spoilage Entry</Text>
              <Text style={styles.modalLabel}>SKU</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {Array.from(new Set(mockLineItems.filter(li => li.jobId === (currentJob?.id ?? '')).map(li => li.sku))).map((sku) => (
                  <TouchableOpacity key={sku} style={[styles.pill, draftSpoilage.sku === sku ? styles.pillActive : undefined]} onPress={() => setDraftSpoilage((d) => ({ ...d, sku }))}>
                    <Text style={[styles.pillText, draftSpoilage.sku === sku ? styles.pillTextActive : undefined]}>{sku}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {Array.from(new Set(mockLineItems.filter(li => li.jobId === (currentJob?.id ?? '') && (draftSpoilage.sku ? li.sku === draftSpoilage.sku : true)).map(li => li.size))).map((size) => (
                  <TouchableOpacity key={size} style={[styles.pill, draftSpoilage.size === size ? styles.pillActive : undefined]} onPress={() => setDraftSpoilage((d) => ({ ...d, size }))}>
                    <Text style={[styles.pillText, draftSpoilage.size === size ? styles.pillTextActive : undefined]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {Array.from(new Set(mockLineItems.filter(li => li.jobId === (currentJob?.id ?? '') && (draftSpoilage.sku ? li.sku === draftSpoilage.sku : true)).map(li => li.color))).map((color) => (
                  <TouchableOpacity key={color} style={[styles.pill, draftSpoilage.color === color ? styles.pillActive : undefined]} onPress={() => setDraftSpoilage((d) => ({ ...d, color }))}>
                    <Text style={[styles.pillText, draftSpoilage.color === color ? styles.pillTextActive : undefined]}>{color}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Reason</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {failReasonOptions.map((r) => (
                  <TouchableOpacity key={r} style={[styles.pill, draftSpoilage.reason === r ? styles.pillActive : undefined]} onPress={() => setDraftSpoilage((d) => ({ ...d, reason: r }))}>
                    <Text style={[styles.pillText, draftSpoilage.reason === r ? styles.pillTextActive : undefined]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={draftSpoilage.quantity}
                onChangeText={(t) => setDraftSpoilage((d) => ({ ...d, quantity: t }))}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
                <TouchableOpacity style={[styles.controlBtn]} onPress={() => setSpoilageEditorOpen(false)}>
                  <Text style={styles.controlBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, styles.controlPrimary]} onPress={() => {
                  const qty = Math.max(1, Number(draftSpoilage.quantity || '0'));
                  if (!draftSpoilage.sku || !draftSpoilage.size || !draftSpoilage.color) {
                    Alert.alert('Incomplete', 'Select SKU, size and color.');
                    return;
                  }
                  const id = Math.random().toString(36).slice(2);
                  const entry: SpoilageEntry = { id, sku: draftSpoilage.sku, size: draftSpoilage.size, color: draftSpoilage.color, quantity: qty, reason: draftSpoilage.reason };
                  setSpoilageEntries((prev) => [...prev, entry]);
                  setSpoilageEditorOpen(false);
                }}>
                  <Text style={[styles.controlBtnText, styles.controlPrimaryText]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {cameraVisible ? (
        <View style={styles.cameraOverlay} testID="camera-overlay">
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Capture – {cameraPhase}</Text>
          </View>
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} testID="camera-flip">
              <Text style={styles.controlBtnText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.controlPrimary]} onPress={handleTakePicture} testID="camera-shutter">
              <Text style={[styles.controlBtnText, styles.controlPrimaryText]}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => { setCameraVisible(false); setCameraPhase(null); }} testID="camera-cancel">
              <Text style={styles.controlBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: { padding: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 16 },
  modeSelector: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 4 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  modeButtonActive: { backgroundColor: "white" },
  modeButtonText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  modeButtonTextActive: { color: "#1e40af" },
  scanButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#1e40af", margin: 20, padding: 16, borderRadius: 12, gap: 12 },
  scanButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  jobsList: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 16 },
  jobCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  jobCardHeader: { marginBottom: 8 },
  jobNumber: { fontSize: 16, fontWeight: "600", color: "#111827" },
  jobCustomer: { fontSize: 14, color: "#374151", marginTop: 4 },
  jobMeta: { fontSize: 12, color: "#6b7280" },
  qcForm: { padding: 20 },
  jobInfoCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  checklistSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  checklistItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  checkbox: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  checkboxEmpty: { width: 20, height: 20, borderWidth: 2, borderColor: "#d1d5db", borderRadius: 4 },
  checklistIcon: { width: 28, alignItems: "center" },
  checklistLabel: { fontSize: 15, color: "#374151" },
  notesSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  notesInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15, marginTop: 8 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  photoButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "white", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#1e40af", gap: 8 },
  photoButtonText: { color: "#1e40af", fontSize: 14, fontWeight: "600" },
  preview: { width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  decisionButtons: { flexDirection: "row", gap: 12, marginBottom: 16 },
  decisionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
  passButton: { backgroundColor: "#10b981" },
  holdButton: { backgroundColor: "#f59e0b" },
  failButton: { backgroundColor: "#ef4444" },
  decisionButtonText: { color: "white", fontSize: 15, fontWeight: "600" },
  cancelButton: { alignItems: "center", padding: 16 },
  cancelButtonText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
  pill: { borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { color: "#111827", fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#ffffff" },
  banner: { paddingVertical: 10, paddingHorizontal: 16 },
  bannerText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  sizeChip: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, minWidth: 120 },
  sizeChipSku: { color: "#111827", fontSize: 12, fontWeight: "700" },
  sizeChipText: { color: "#6b7280", fontSize: 12 },
  sizeChipQty: { color: "#1e40af", fontSize: 12, fontWeight: "700", marginTop: 2 },
  cameraOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000", zIndex: 50 },
  cameraHeader: { paddingTop: 40, paddingHorizontal: 16, paddingBottom: 8 },
  cameraTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  cameraWrap: { flex: 1, overflow: "hidden" },
  camera: { flex: 1 },
  cameraControls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  controlBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" },
  controlBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  controlPrimary: { backgroundColor: "#22c55e" },
  controlPrimaryText: { color: "#ffffff" },

  spoilageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  spoilageTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addSpoilageBtn: { backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addSpoilageText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  spoilageList: { marginTop: 12, gap: 8 },
  spoilageItem: { padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fafafa', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spoilageText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  spoilageSku: { color: '#6b7280', fontSize: 12 },
  removeText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  spoilageEmpty: { color: '#6b7280', fontSize: 13, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },

  guideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  guideCard: { width: '100%', maxWidth: 520, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
  guideTitle: { fontSize: 18, fontWeight: '700', color: '#111827', padding: 16 },
  guideImage: { width: '100%', height: 160 },
  guideSteps: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 6 },
  guideStep: { color: '#374151', fontSize: 14 },
  guideActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
});