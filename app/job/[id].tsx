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
import { useLocalSearchParams, router, Stack } from "expo-router";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Printer,
  Play,
  Pause,
} from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { useAuth } from "@/contexts/AuthContext";
import { JobStatus } from "@/types/job";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { jobs, updateJobStatus } = useJobs();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [isInProduction, setIsInProduction] = useState(false);

  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <View style={styles.container}>
        <Text>Job not found</Text>
      </View>
    );
  }

  const handleStartProduction = () => {
    updateJobStatus(job.id, JobStatus.IN_PRODUCTION);
    setIsInProduction(true);
    Alert.alert("Production Started", `Job #${job.orderNumber} is now in production`);
  };

  const handleCompleteProduction = () => {
    updateJobStatus(job.id, JobStatus.COMPLETED);
    setIsInProduction(false);
    Alert.alert("Production Complete", `Job #${job.orderNumber} has been completed`);
  };

  const handleQCRequest = () => {
    updateJobStatus(job.id, JobStatus.QC_PENDING);
    Alert.alert("QC Requested", "Job has been sent to Quality Control");
  };

  const generateLabel = () => {
    Alert.alert("Label Generated", "Box label has been generated and sent to printer");
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.NEW:
        return "#6b7280";
      case JobStatus.IN_PRODUCTION:
        return "#3b82f6";
      case JobStatus.COMPLETED:
        return "#10b981";
      case JobStatus.QC_PENDING:
        return "#f59e0b";
      case JobStatus.QC_FAILED:
        return "#ef4444";
      case JobStatus.READY_TO_SHIP:
        return "#8b5cf6";
      case JobStatus.SHIPPED:
        return "#059669";
      default:
        return "#6b7280";
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: `Job #${job.orderNumber}` }} />
      <ScrollView style={styles.container}>
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(job.status) },
            ]}
          />
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusText}>
              {job.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{job.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{job.department}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity</Text>
            <Text style={styles.infoValue}>{job.quantity} units</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Source</Text>
            <Text style={styles.infoValue}>{job.source}</Text>
          </View>
          {job.dueDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={styles.infoValue}>
                {new Date(job.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {job.priority && (
            <View style={styles.priorityBadge}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.priorityText}>PRIORITY ORDER</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Production Actions</Text>
          
          {job.status === JobStatus.NEW && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartProduction}
            >
              <Play size={20} color="white" />
              <Text style={styles.actionButtonText}>Start Production</Text>
            </TouchableOpacity>
          )}

          {job.status === JobStatus.IN_PRODUCTION && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleCompleteProduction}
              >
                <CheckCircle size={20} color="white" />
                <Text style={styles.actionButtonText}>Mark Complete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.pauseButton]}
                onPress={() => Alert.alert("Paused", "Production paused")}
              >
                <Pause size={20} color="white" />
                <Text style={styles.actionButtonText}>Pause Production</Text>
              </TouchableOpacity>
            </>
          )}

          {job.status === JobStatus.COMPLETED && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.qcButton]}
                onPress={handleQCRequest}
              >
                <CheckCircle size={20} color="white" />
                <Text style={styles.actionButtonText}>Request QC</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.labelButton]}
                onPress={generateLabel}
              >
                <Printer size={20} color="white" />
                <Text style={styles.actionButtonText}>Generate Label</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.photoButton}>
            <Camera size={20} color="#1e40af" />
            <Text style={styles.photoButtonText}>Add Photos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Production Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this job..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.saveNotesButton}>
            <Text style={styles.saveNotesButtonText}>Save Notes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Activity History</Text>
          <View style={styles.historyItem}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historyAction}>Job Created</Text>
              <Text style={styles.historyTime}>2 hours ago</Text>
            </View>
          </View>
          {job.status !== JobStatus.NEW && (
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: "#3b82f6" }]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyAction}>Production Started</Text>
                <Text style={styles.historyTime}>1 hour ago</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  statusIndicator: {
    width: 12,
    height: 48,
    borderRadius: 6,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textTransform: "uppercase",
  },
  infoCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  priorityText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  actionsCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: "#3b82f6",
  },
  completeButton: {
    backgroundColor: "#10b981",
  },
  pauseButton: {
    backgroundColor: "#f59e0b",
  },
  qcButton: {
    backgroundColor: "#8b5cf6",
  },
  labelButton: {
    backgroundColor: "#1e40af",
  },
  actionButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e40af",
    gap: 8,
  },
  photoButtonText: {
    color: "#1e40af",
    fontSize: 15,
    fontWeight: "600",
  },
  notesCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
  },
  saveNotesButton: {
    backgroundColor: "#1e40af",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveNotesButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
  },
  historyItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  historyTime: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
});