import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
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

export default function QCScreen() {
  const { jobs, updateJobStatus } = useJobs();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [qcMode, setQcMode] = useState<"live" | "recheck">("live");
  const [notes, setNotes] = useState("");

  const qcPendingJobs = jobs.filter(
    (job) =>
      job.status === JobStatus.QC_PENDING || job.status === JobStatus.QC_FAILED
  );

  const currentJob = selectedJob
    ? jobs.find((j) => j.id === selectedJob)
    : null;

  const checklist = [
    { id: "alignment", label: "Alignment correct", checked: false },
    { id: "placement", label: "Placement accurate", checked: false },
    { id: "colors", label: "Colors match proof", checked: false },
    { id: "quality", label: "Print quality acceptable", checked: false },
    { id: "packaging", label: "Packaging intact", checked: false },
  ];

  const [checklistState, setChecklistState] = useState(checklist);

  const toggleChecklistItem = (id: string) => {
    setChecklistState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleQCDecision = (decision: "pass" | "fail" | "hold") => {
    if (!currentJob) return;

    let newStatus: JobStatus;
    let message: string;

    switch (decision) {
      case "pass":
        newStatus = JobStatus.READY_TO_SHIP;
        message = "Job passed QC and is ready to ship";
        break;
      case "fail":
        newStatus = JobStatus.QC_FAILED;
        message = "Job failed QC and needs rework";
        break;
      case "hold":
        newStatus = JobStatus.QC_PENDING;
        message = "Job placed on hold for review";
        break;
      default:
        return;
    }

    updateJobStatus(currentJob.id, newStatus);
    Alert.alert("QC Complete", message);
    
    // Reset form
    setSelectedJob(null);
    setNotes("");
    setChecklistState(checklist);
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
              style={[
                styles.modeButton,
                qcMode === "live" && styles.modeButtonActive,
              ]}
              onPress={() => setQcMode("live")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  qcMode === "live" && styles.modeButtonTextActive,
                ]}
              >
                Live QC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                qcMode === "recheck" && styles.modeButtonActive,
              ]}
              onPress={() => setQcMode("recheck")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  qcMode === "recheck" && styles.modeButtonTextActive,
                ]}
              >
                Recheck
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={scanForJob}>
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
          <Text style={styles.sectionTitle}>QC Checklist</Text>
          {checklistState.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem(item.id)}
            >
              <View style={styles.checkbox}>
                {item.checked && <CheckCircle size={20} color="#10b981" />}
                {!item.checked && <View style={styles.checkboxEmpty} />}
              </View>
              <Text style={styles.checklistLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Inspector Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any observations or issues..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.photoButton}>
          <Camera size={20} color="#1e40af" />
          <Text style={styles.photoButtonText}>Add Photos</Text>
        </TouchableOpacity>

        <View style={styles.decisionButtons}>
          <TouchableOpacity
            style={[styles.decisionButton, styles.passButton]}
            onPress={() => handleQCDecision("pass")}
          >
            <CheckCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.decisionButton, styles.holdButton]}
            onPress={() => handleQCDecision("hold")}
          >
            <AlertCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Hold</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.decisionButton, styles.failButton]}
            onPress={() => handleQCDecision("fail")}
          >
            <XCircle size={20} color="white" />
            <Text style={styles.decisionButtonText}>Fail</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: "white",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  modeButtonTextActive: {
    color: "#1e40af",
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
    marginBottom: 8,
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
  jobMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  qcForm: {
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
  checklistSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
  },
  checklistLabel: {
    fontSize: 15,
    color: "#374151",
  },
  notesSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e40af",
    gap: 8,
    marginBottom: 20,
  },
  photoButtonText: {
    color: "#1e40af",
    fontSize: 15,
    fontWeight: "600",
  },
  decisionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  decisionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  passButton: {
    backgroundColor: "#10b981",
  },
  holdButton: {
    backgroundColor: "#f59e0b",
  },
  failButton: {
    backgroundColor: "#ef4444",
  },
  decisionButtonText: {
    color: "white",
    fontSize: 15,
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