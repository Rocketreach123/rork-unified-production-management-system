import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Printer,
  Play,
  Pause,
  Square,
  AlertTriangle,
} from "lucide-react-native";
import { useJobs } from "@/contexts/JobContext";
import { useAuth } from "@/contexts/AuthContext";
import { JobStatus, ProductionState, SpoilageData, HoldData } from "@/types/job";
import {
  PauseProductionModal,
  StopProductionModal,
  HoldJobModal,
  TestPrintModal,
  OperatorPinModal,
  ImprintCompletionModal,
} from "@/components/ProductionModals";
import { ImprintDisplay } from "@/components/ImprintDisplay";
import { trpc } from "@/lib/trpc";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { jobs, updateJobStatus } = useJobs();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [productionState, setProductionState] = useState<ProductionState>(ProductionState.STOPPED);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showTestPrintModal, setShowTestPrintModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showImprintModal, setShowImprintModal] = useState(false);
  const [testPrintApproved, setTestPrintApproved] = useState(false);
  const submitTestPrint = trpc.testprint.submit.useMutation();
  const [isProductionMode, setIsProductionMode] = useState(false);
  const [operatorPin, setOperatorPin] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("SP-01");
  const [isHoldLocked, setIsHoldLocked] = useState(false);
  const [completedImprints, setCompletedImprints] = useState<string[]>([]);

  const job = jobs.find((j) => j.id === id);

  console.log('User:', user?.name, 'Production mode:', isProductionMode, 'Completed imprints:', completedImprints.length);

  // Check if job is on hold and should be locked
  useEffect(() => {
    if (job) {
      setIsHoldLocked(job.status === JobStatus.ON_HOLD);
    }
  }, [job]);

  if (!job) {
    return (
      <View style={styles.container}>
        <Text>Job not found</Text>
      </View>
    );
  }

  const handleOperatorLogin = () => {
    setShowPinModal(true);
  };

  const handlePinSubmit = (pin: string, machine: string) => {
    setOperatorPin(pin);
    setMachineId(machine);
    console.log(`Operator logged in with PIN: ${pin} on machine: ${machine}`);
  };

  const handleTestPrintSubmit = async (photo: string) => {
    try {
      await submitTestPrint.mutateAsync({
        jobId: job.id,
        orderNumber: job.orderNumber,
        operatorId: user?.id,
        pressId: job.machineId ?? machineId,
        photo,
      });
      updateJobStatus(job.id, JobStatus.TEST_PRINT_PENDING);
      Alert.alert(
        "Submitted",
        "Test print sent to supervisor. You'll be notified when it's reviewed."
      );
    } catch (e) {
      Alert.alert("Error", "Failed to submit test print. Please try again.");
    }
  };

  const handleStartProduction = () => {
    if (!operatorPin) {
      handleOperatorLogin();
      return;
    }

    if (!testPrintApproved && job.status === JobStatus.NEW) {
      setShowTestPrintModal(true);
      return;
    }
    
    updateJobStatus(job.id, JobStatus.IN_PRODUCTION);
    setProductionState(ProductionState.RUNNING);
    setIsProductionMode(true);
    Alert.alert("Production Started", `Job #${job.orderNumber} is now in production on ${machineId}`);
  };

  const handleExitProductionMode = () => {
    setIsProductionMode(false);
  };

  const handleCompleteImprints = () => {
    setShowImprintModal(true);
  };

  const handleImprintCompletion = (completedIds: string[]) => {
    setCompletedImprints(completedIds);
    console.log('Completed imprints:', completedIds);
  };

  const handleManagerOverride = () => {
    Alert.prompt(
      "Manager Override",
      "Enter 4-digit manager code to release hold:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Release Hold",
          onPress: (code) => {
            if (code === "1234") { // Mock manager code
              setIsHoldLocked(false);
              updateJobStatus(job.id, JobStatus.NEW);
              Alert.alert("Hold Released", "Job has been released from hold status.");
            } else {
              Alert.alert("Invalid Code", "Incorrect manager override code.");
            }
          }
        }
      ],
      "secure-text"
    );
  };

  const handlePauseProduction = () => {
    setShowPauseModal(true);
  };

  const handlePauseSubmit = (data: { notes?: string; photos?: string[]; spoilageData?: SpoilageData }) => {
    console.log("Pause data:", data);
    setProductionState(ProductionState.PAUSED);
    updateJobStatus(job.id, JobStatus.PAUSED);
    Alert.alert("Production Paused", "Production has been paused and logged.");
  };

  const handleResumeProduction = () => {
    setProductionState(ProductionState.RUNNING);
    updateJobStatus(job.id, JobStatus.IN_PRODUCTION);
    Alert.alert("Production Resumed", "Production has been resumed.");
  };

  const handleStopProduction = () => {
    setShowStopModal(true);
  };

  const handleStopSubmit = (data: { notes?: string; photos?: string[]; spoilageData?: SpoilageData }) => {
    console.log("Stop data:", data);
    setProductionState(ProductionState.STOPPED);
    updateJobStatus(job.id, JobStatus.COMPLETED);
    Alert.alert("Production Complete", `Job #${job.orderNumber} has been completed`);
  };

  const handleHoldJob = () => {
    setShowHoldModal(true);
  };

  const handleHoldSubmit = (data: HoldData) => {
    console.log("Hold data:", data);
    updateJobStatus(job.id, JobStatus.ON_HOLD);
    Alert.alert(
      "Job On Hold", 
      "Job has been placed on hold and your supervisor has been notified via Microsoft Teams."
    );
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
      case JobStatus.TEST_PRINT_PENDING:
        return "#f59e0b";
      case JobStatus.TEST_PRINT_APPROVED:
        return "#10b981";
      case JobStatus.IN_PRODUCTION:
        return "#3b82f6";
      case JobStatus.PAUSED:
        return "#f59e0b";
      case JobStatus.ON_HOLD:
        return "#dc2626";
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

  const canStartProduction = () => {
    return job.status === JobStatus.NEW || 
           job.status === JobStatus.TEST_PRINT_APPROVED;
  };

  const isProductionActive = () => {
    return job.status === JobStatus.IN_PRODUCTION || 
           job.status === JobStatus.PAUSED;
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

        {/* Imprint Display */}
        <ImprintDisplay jobId={job.id} />

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Production Actions</Text>
          
          {/* Test Print Status */}
          {job.status === JobStatus.TEST_PRINT_PENDING && (
            <View style={styles.statusAlert}>
              <Clock size={20} color="#f59e0b" />
              <Text style={styles.statusAlertText}>
                Test print submitted - waiting for supervisor approval
              </Text>
            </View>
          )}

          {job.status === JobStatus.TEST_PRINT_APPROVED && (
            <View style={[styles.statusAlert, styles.approvedAlert]}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={[styles.statusAlertText, styles.approvedAlertText]}>
                Test print approved - ready to start production
              </Text>
            </View>
          )}

          {/* Start Production */}
          {canStartProduction() && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartProduction}
            >
              <Play size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {job.status === JobStatus.NEW ? "Submit Test Print" : "Start Production"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Production Controls */}
          {job.status === JobStatus.IN_PRODUCTION && (
            <>
              <View style={styles.productionControls}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.pauseButton]}
                  onPress={handlePauseProduction}
                >
                  <Pause size={18} color="white" />
                  <Text style={styles.controlButtonText}>Pause</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.stopButton]}
                  onPress={handleStopProduction}
                >
                  <Square size={18} color="white" />
                  <Text style={styles.controlButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Resume from Pause */}
          {job.status === JobStatus.PAUSED && (
            <>
              <View style={styles.productionControls}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.resumeButton]}
                  onPress={handleResumeProduction}
                >
                  <Play size={18} color="white" />
                  <Text style={styles.controlButtonText}>Resume</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.stopButton]}
                  onPress={handleStopProduction}
                >
                  <Square size={18} color="white" />
                  <Text style={styles.controlButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Hold Button - Always visible during production */}
          {(isProductionActive() || canStartProduction()) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.holdButton]}
              onPress={handleHoldJob}
            >
              <AlertTriangle size={20} color="white" />
              <Text style={styles.actionButtonText}>🚩 Hold Job</Text>
            </TouchableOpacity>
          )}

          {/* Post-Production Actions */}
          {job.status === JobStatus.COMPLETED && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.imprintButton]}
                onPress={handleCompleteImprints}
              >
                <CheckCircle size={20} color="white" />
                <Text style={styles.actionButtonText}>Mark Imprints Complete</Text>
              </TouchableOpacity>

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

          {/* Hold Status */}
          {job.status === JobStatus.ON_HOLD && (
            <>
              <View style={[styles.statusAlert, styles.holdAlert]}>
                <AlertTriangle size={20} color="#dc2626" />
                <Text style={[styles.statusAlertText, styles.holdAlertText]}>
                  Job is on hold - supervisor has been notified
                </Text>
              </View>
              
              {isHoldLocked && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.overrideButton]}
                  onPress={handleManagerOverride}
                >
                  <AlertTriangle size={20} color="white" />
                  <Text style={styles.actionButtonText}>Manager Override</Text>
                </TouchableOpacity>
              )}
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

      {/* Modals */}
      <PauseProductionModal
        visible={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        jobId={job.id}
        onSubmit={handlePauseSubmit}
      />

      <StopProductionModal
        visible={showStopModal}
        onClose={() => setShowStopModal(false)}
        jobId={job.id}
        onSubmit={handleStopSubmit}
      />

      <HoldJobModal
        visible={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        jobId={job.id}
        onSubmit={handleHoldSubmit}
      />

      <TestPrintModal
        visible={showTestPrintModal}
        onClose={() => setShowTestPrintModal(false)}
        jobId={job.id}
        onSubmit={handleTestPrintSubmit}
      />

      <OperatorPinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
      />

      <ImprintCompletionModal
        visible={showImprintModal}
        onClose={() => setShowImprintModal(false)}
        jobId={job.id}
        onSubmit={handleImprintCompletion}
      />
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
  holdButton: {
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#b91c1c",
  },
  qcButton: {
    backgroundColor: "#8b5cf6",
  },
  labelButton: {
    backgroundColor: "#1e40af",
  },
  imprintButton: {
    backgroundColor: "#8b5cf6",
  },
  overrideButton: {
    backgroundColor: "#f59e0b",
  },
  productionControls: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  pauseButton: {
    backgroundColor: "#f59e0b",
  },
  resumeButton: {
    backgroundColor: "#10b981",
  },
  stopButton: {
    backgroundColor: "#dc2626",
  },
  controlButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  statusAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    gap: 8,
    marginBottom: 12,
  },
  statusAlertText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
  },
  approvedAlert: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
  },
  approvedAlertText: {
    color: "#065f46",
  },
  holdAlert: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
  },
  holdAlertText: {
    color: "#991b1b",
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