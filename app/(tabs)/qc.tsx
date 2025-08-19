import React, { useMemo, useState } from "react";
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
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Scan,
} from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { JobStatus } from "@/types/job";
import { trpc } from "@/lib/trpc";
import type { QCStatus, QCService, QCPhase } from "@/types/qc";

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
  const [missingCount, setMissingCount] = useState<string>("0");
  const [failReasons, setFailReasons] = useState<string[]>([]);
  const [status, setStatus] = useState<QCStatus>("Recheck Needed");
  const [goodPhotoUrl, setGoodPhotoUrl] = useState<string>("");
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>("");
  const [correctionsPhotoUrl, setCorrectionsPhotoUrl] = useState<string>("");
  const [labelsPhotoUrl, setLabelsPhotoUrl] = useState<string>("");
  const [discrepancy, setDiscrepancy] = useState<string>("");
  const [fixesNotes, setFixesNotes] = useState<string>("");

  const qcPendingJobs = useMemo(() => jobs.filter(
    (job) => job.status === JobStatus.QC_PENDING || job.status === JobStatus.QC_FAILED
  ), [jobs]);

  const currentJob = selectedJob ? jobs.find((j) => j.id === selectedJob) ?? null : null;

  const checklist = [
    { id: "alignment", label: "Alignment correct", checked: false },
    { id: "placement", label: "Placement accurate", checked: false },
    { id: "colors", label: "Colors match proof", checked: false },
    { id: "quality", label: "Print quality acceptable", checked: false },
    { id: "packaging", label: "Packaging intact", checked: false },
  ];

  const [checklistState, setChecklistState] = useState<typeof checklist>(checklist);

  const toggleChecklistItem = (id: string) => {
    setChecklistState((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
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
        missing_count: Number(missingCount || "0"),
        fail_reasons: failReasons,
        status: decidedStatus,
        discrepancy_summary: discrepancy,
        fixes_notes: fixesNotes,
        comments: notes,
      });

      const uploads: Array<{ url: string; phase: QCPhase }> = [];
      if (goodPhotoUrl) uploads.push({ url: goodPhotoUrl, phase: "Good Piece" });
      if (failedPhotoUrl) uploads.push({ url: failedPhotoUrl, phase: "Failed Pieces" });
      if (correctionsPhotoUrl) uploads.push({ url: correctionsPhotoUrl, phase: "Corrections" });
      if (labelsPhotoUrl) uploads.push({ url: labelsPhotoUrl, phase: "Box Labels" });

      for (const u of uploads) {
        await uploadFileMutation.mutateAsync({
          qc_form_id: form.id,
          phase: u.phase,
          file_path: u.url,
          uploaded_by: Number(currentJob.qcInspectorId ?? 0),
        });
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
      setChecklistState(checklist);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.qcForm}>
        <View style={styles.jobInfoCard}>
          <Text style={styles.jobNumber}>#{currentJob?.orderNumber}</Text>
          <Text style={styles.jobCustomer}>{currentJob?.customerName}</Text>
          <Text style={styles.jobMeta}>
            {currentJob?.department} • {currentJob?.quantity} units
          </Text>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>Services Checked</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {serviceOptions.map((svc) => (
              <TouchableOpacity
                key={svc}
                onPress={() => toggleService(svc)}
                style={[styles.pill, services.includes(svc) ? styles.pillActive : undefined]}
                testID={`svc-${svc}`}
              >
                <Text style={[styles.pillText, services.includes(svc) ? styles.pillTextActive : undefined]}>{svc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>QC Checklist</Text>
          {checklistState.map((item) => (
            <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)}>
              <View style={styles.checkbox}>
                {item.checked ? <CheckCircle size={20} color="#10b981" /> : <View style={styles.checkboxEmpty} />}
              </View>
              <Text style={styles.checklistLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Design Issues / Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any observations or issues..."
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
          <TextInput
            style={styles.input}
            placeholder="Total missing/failed count"
            keyboardType="number-pad"
            value={missingCount}
            onChangeText={setMissingCount}
            testID="missing-count"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {failReasonOptions.map((r) => (
              <TouchableOpacity key={r} onPress={() => toggleFailReason(r)} style={[styles.pill, failReasons.includes(r) ? styles.pillActive : undefined]} testID={`fail-${r}`}>
                <Text style={[styles.pillText, failReasons.includes(r) ? styles.pillTextActive : undefined]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Packaging & Labels</Text>
          <TextInput style={styles.input} placeholder="Final discrepancy summary (SKU/Color/Size/QTY)" value={discrepancy} onChangeText={setDiscrepancy} testID="discrepancy" />
          <TextInput style={styles.input} placeholder="Fixes made (optional)" value={fixesNotes} onChangeText={setFixesNotes} testID="fixes-notes" />
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Attach Photo Links (M365/SharePoint)</Text>
          <TextInput style={styles.input} placeholder="Good piece photo URL" value={goodPhotoUrl} onChangeText={setGoodPhotoUrl} testID="photo-good" />
          <TextInput style={styles.input} placeholder="Failed pieces photo URL" value={failedPhotoUrl} onChangeText={setFailedPhotoUrl} testID="photo-failed" />
          <TextInput style={styles.input} placeholder="Corrections photo URL" value={correctionsPhotoUrl} onChangeText={setCorrectionsPhotoUrl} testID="photo-corrections" />
          <TextInput style={styles.input} placeholder="Labels & boxes photo URL" value={labelsPhotoUrl} onChangeText={setLabelsPhotoUrl} testID="photo-labels" />
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
  checklistLabel: { fontSize: 15, color: "#374151" },
  notesSection: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 20 },
  notesInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 15, marginTop: 8 },
  photoButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "white", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#1e40af", gap: 8, marginBottom: 20 },
  photoButtonText: { color: "#1e40af", fontSize: 15, fontWeight: "600" },
  decisionButtons: { flexDirection: "row", gap: 12, marginBottom: 16 },
  decisionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
  passButton: { backgroundColor: "#10b981" },
  holdButton: { backgroundColor: "#f59e0b" },
  failButton: { backgroundColor: "#ef4444" },
  decisionButtonText: { color: "white", fontSize: 15, fontWeight: "600" },
  cancelButton: { alignItems: "center", padding: 16 },
  cancelButtonText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
  pill: { borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { color: "#111827", fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#ffffff" },
});