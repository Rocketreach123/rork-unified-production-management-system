import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import {
  X,
  Camera,
  AlertTriangle,
  CheckCircle,
} from "lucide-react-native";
import {
  SpoilageReason,
  HoldReason,
  SpoilageData,
  HoldData,
} from "@/types/job";
import { mockLineItems } from "@/mocks/jobs";

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
}

interface PauseModalProps extends BaseModalProps {
  onSubmit: (data: { notes?: string; photos?: string[]; spoilageData?: SpoilageData }) => void;
}

interface StopModalProps extends BaseModalProps {
  onSubmit: (data: { notes?: string; photos?: string[]; spoilageData?: SpoilageData }) => void;
}

interface HoldModalProps extends BaseModalProps {
  onSubmit: (data: HoldData) => void;
}

interface TestPrintModalProps extends BaseModalProps {
  onSubmit: (photo: string) => void;
}

export function PauseProductionModal({ visible, onClose, jobId, onSubmit }: PauseModalProps) {
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSpoilageForm, setShowSpoilageForm] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<string>("");
  const [qtyAffected, setQtyAffected] = useState("");
  const [spoilageReason, setSpoilageReason] = useState<SpoilageReason | "">("");
  const [spoilageNotes, setSpoilageNotes] = useState("");

  const lineItems = mockLineItems.filter(item => item.jobId === jobId);

  const handleSubmit = () => {
    const spoilageData = showSpoilageForm && selectedLineItem && qtyAffected && spoilageReason ? {
      lineItemId: selectedLineItem,
      qtyAffected: parseInt(qtyAffected),
      reason: spoilageReason,
      notes: spoilageNotes,
      photos,
    } : undefined;

    onSubmit({
      notes,
      photos,
      spoilageData,
    });

    // Reset form
    setNotes("");
    setPhotos([]);
    setShowSpoilageForm(false);
    setSelectedLineItem("");
    setQtyAffected("");
    setSpoilageReason("");
    setSpoilageNotes("");
    onClose();
  };

  const addPhoto = () => {
    // Mock photo URL for demo
    const mockPhotoUrl = `https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop&t=${Date.now()}`;
    setPhotos([...photos, mockPhotoUrl]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pause Production</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Notes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Why is production being paused?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos (Optional)</Text>
            <TouchableOpacity style={styles.photoButton} onPress={addPhoto}>
              <Camera size={20} color="#1e40af" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <ScrollView horizontal style={styles.photoPreview}>
                {photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.spoilageToggle}
              onPress={() => setShowSpoilageForm(!showSpoilageForm)}
            >
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.spoilageToggleText}>Report Spoilage</Text>
            </TouchableOpacity>

            {showSpoilageForm && (
              <View style={styles.spoilageForm}>
                <Text style={styles.inputLabel}>Line Item</Text>
                <ScrollView horizontal style={styles.lineItemScroll}>
                  {lineItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.lineItemChip,
                        selectedLineItem === item.id && styles.lineItemChipSelected,
                      ]}
                      onPress={() => setSelectedLineItem(item.id)}
                    >
                      <Text style={[
                        styles.lineItemChipText,
                        selectedLineItem === item.id && styles.lineItemChipTextSelected,
                      ]}>
                        {item.sku} - {item.color} - {item.size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Quantity Affected</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter quantity"
                  value={qtyAffected}
                  onChangeText={setQtyAffected}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Reason</Text>
                <ScrollView horizontal style={styles.reasonScroll}>
                  {Object.values(SpoilageReason).map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        spoilageReason === reason && styles.reasonChipSelected,
                      ]}
                      onPress={() => setSpoilageReason(reason)}
                    >
                      <Text style={[
                        styles.reasonChipText,
                        spoilageReason === reason && styles.reasonChipTextSelected,
                      ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Additional Notes</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the issue..."
                  value={spoilageNotes}
                  onChangeText={setSpoilageNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Pause Production</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function StopProductionModal({ visible, onClose, jobId, onSubmit }: StopModalProps) {
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSpoilageForm, setShowSpoilageForm] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<string>("");
  const [qtyAffected, setQtyAffected] = useState("");
  const [spoilageReason, setSpoilageReason] = useState<SpoilageReason | "">("");
  const [spoilageNotes, setSpoilageNotes] = useState("");

  const lineItems = mockLineItems.filter(item => item.jobId === jobId);

  const handleSubmit = () => {
    const spoilageData = showSpoilageForm && selectedLineItem && qtyAffected && spoilageReason ? {
      lineItemId: selectedLineItem,
      qtyAffected: parseInt(qtyAffected),
      reason: spoilageReason,
      notes: spoilageNotes,
      photos,
    } : undefined;

    onSubmit({
      notes,
      photos,
      spoilageData,
    });

    // Reset form
    setNotes("");
    setPhotos([]);
    setShowSpoilageForm(false);
    setSelectedLineItem("");
    setQtyAffected("");
    setSpoilageReason("");
    setSpoilageNotes("");
    onClose();
  };

  const addPhoto = () => {
    const mockPhotoUrl = `https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop&t=${Date.now()}`;
    setPhotos([...photos, mockPhotoUrl]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Complete Production</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Notes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any final notes about this production run?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Final Photos (Optional)</Text>
            <TouchableOpacity style={styles.photoButton} onPress={addPhoto}>
              <Camera size={20} color="#1e40af" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <ScrollView horizontal style={styles.photoPreview}>
                {photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.spoilageToggle}
              onPress={() => setShowSpoilageForm(!showSpoilageForm)}
            >
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.spoilageToggleText}>Report Final Spoilage</Text>
            </TouchableOpacity>

            {showSpoilageForm && (
              <View style={styles.spoilageForm}>
                <Text style={styles.inputLabel}>Line Item</Text>
                <ScrollView horizontal style={styles.lineItemScroll}>
                  {lineItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.lineItemChip,
                        selectedLineItem === item.id && styles.lineItemChipSelected,
                      ]}
                      onPress={() => setSelectedLineItem(item.id)}
                    >
                      <Text style={[
                        styles.lineItemChipText,
                        selectedLineItem === item.id && styles.lineItemChipTextSelected,
                      ]}>
                        {item.sku} - {item.color} - {item.size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Quantity Affected</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter quantity"
                  value={qtyAffected}
                  onChangeText={setQtyAffected}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Reason</Text>
                <ScrollView horizontal style={styles.reasonScroll}>
                  {Object.values(SpoilageReason).map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        spoilageReason === reason && styles.reasonChipSelected,
                      ]}
                      onPress={() => setSpoilageReason(reason)}
                    >
                      <Text style={[
                        styles.reasonChipText,
                        spoilageReason === reason && styles.reasonChipTextSelected,
                      ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Additional Notes</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the issue..."
                  value={spoilageNotes}
                  onChangeText={setSpoilageNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, styles.completeButton]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Complete Production</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function HoldJobModal({ visible, onClose, jobId, onSubmit }: HoldModalProps) {
  const [reason, setReason] = useState<HoldReason | "">("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!reason || !notes) {
      Alert.alert("Missing Information", "Please select a reason and provide notes.");
      return;
    }

    onSubmit({
      reason,
      notes,
      photos,
      supervisorNotified: true,
    });

    // Reset form
    setReason("");
    setNotes("");
    setPhotos([]);
    onClose();
  };

  const addPhoto = () => {
    const mockPhotoUrl = `https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop&t=${Date.now()}`;
    setPhotos([...photos, mockPhotoUrl]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.holdHeaderContent}>
            <AlertTriangle size={24} color="#dc2626" />
            <Text style={[styles.modalTitle, styles.holdTitle]}>Hold Job</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Hold *</Text>
            <View style={styles.reasonGrid}>
              {Object.values(HoldReason).map((holdReason) => (
                <TouchableOpacity
                  key={holdReason}
                  style={[
                    styles.holdReasonChip,
                    reason === holdReason && styles.holdReasonChipSelected,
                  ]}
                  onPress={() => setReason(holdReason)}
                >
                  <Text style={[
                    styles.holdReasonChipText,
                    reason === holdReason && styles.holdReasonChipTextSelected,
                  ]}>
                    {holdReason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Notes *</Text>
            <TextInput
              style={[styles.textInput, styles.requiredInput]}
              placeholder="Describe the issue that requires supervisor attention..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence Photos (Optional)</Text>
            <TouchableOpacity style={styles.photoButton} onPress={addPhoto}>
              <Camera size={20} color="#1e40af" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <ScrollView horizontal style={styles.photoPreview}>
                {photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.warningBox}>
            <AlertTriangle size={20} color="#dc2626" />
            <Text style={styles.warningText}>
              This will immediately notify your supervisor via Microsoft Teams and halt production.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, styles.holdButton]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Hold Job</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function TestPrintModal({ visible, onClose, jobId, onSubmit }: TestPrintModalProps) {
  const [photo, setPhoto] = useState<string>("");

  const handleSubmit = () => {
    if (!photo) {
      Alert.alert("Photo Required", "Please take a photo of the test print.");
      return;
    }

    onSubmit(photo);
    setPhoto("");
    onClose();
  };

  const takePhoto = () => {
    const mockPhotoUrl = `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&t=${Date.now()}`;
    setPhoto(mockPhotoUrl);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Test Print Approval</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Print Photo *</Text>
            <Text style={styles.sectionDescription}>
              Take a clear photo of your test print for supervisor approval before starting production.
            </Text>
            
            {!photo ? (
              <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                <Camera size={32} color="#1e40af" />
                <Text style={styles.cameraButtonText}>Take Test Print Photo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.testPrintPhoto} />
                <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoBox}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.infoText}>
              Your supervisor will review this test print and either approve or request changes before production can begin.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, !photo && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={!photo}
          >
            <Text style={[styles.submitButtonText, !photo && styles.disabledButtonText]}>
              Submit for Approval
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  holdTitle: {
    color: "#dc2626",
  },
  holdHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
  },
  requiredInput: {
    borderColor: "#dc2626",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e40af",
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "500",
  },
  photoPreview: {
    marginTop: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  spoilageToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    gap: 8,
  },
  spoilageToggleText: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "500",
  },
  spoilageForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
  },
  lineItemScroll: {
    marginBottom: 8,
  },
  lineItemChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  lineItemChipSelected: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  lineItemChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  lineItemChipTextSelected: {
    color: "white",
  },
  reasonScroll: {
    marginBottom: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  reasonChipSelected: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  reasonChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  reasonChipTextSelected: {
    color: "white",
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  holdReasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: "45%",
  },
  holdReasonChipSelected: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  holdReasonChipText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  holdReasonChipTextSelected: {
    color: "white",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  cameraButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderWidth: 2,
    borderColor: "#1e40af",
    borderStyle: "dashed",
    borderRadius: 12,
    gap: 12,
  },
  cameraButtonText: {
    color: "#1e40af",
    fontSize: 16,
    fontWeight: "600",
  },
  photoContainer: {
    alignItems: "center",
    gap: 12,
  },
  testPrintPhoto: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  retakeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  retakeButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f59e0b",
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: "#10b981",
  },
  holdButton: {
    backgroundColor: "#dc2626",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
  },
  disabledButtonText: {
    color: "#9ca3af",
  },
});