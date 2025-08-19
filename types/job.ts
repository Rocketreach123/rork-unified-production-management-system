export enum JobStatus {
  NEW = "NEW",
  TEST_PRINT_PENDING = "TEST_PRINT_PENDING",
  TEST_PRINT_APPROVED = "TEST_PRINT_APPROVED",
  IN_PRODUCTION = "IN_PRODUCTION",
  PAUSED = "PAUSED",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  QC_PENDING = "QC_PENDING",
  QC_PASSED = "QC_PASSED",
  QC_FAILED = "QC_FAILED",
  READY_TO_SHIP = "READY_TO_SHIP",
  SHIPPED = "SHIPPED",
}

export enum Department {
  SCREEN_PRINT = "Screen Print",
  EMBROIDERY = "Embroidery",
  FULFILLMENT = "Fulfillment",
}

export interface Job {
  id: string;
  orderNumber: string;
  customerName: string;
  department: Department;
  status: JobStatus;
  quantity: number;
  priority: boolean;
  source: "Printavo" | "Custom Ink";
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  boxCount?: number;
  weight?: number;
  notes?: string;
  machineId?: string;
  operatorId?: string;
  qcInspectorId?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
}

export interface BoxLabel {
  id: string;
  jobId: string;
  boxNumber: number;
  totalBoxes: number;
  department: Department;
  orderNumber: string;
  source: "Printavo" | "Custom Ink";
  symbols: string[];
  barcode: string;
  createdAt: Date;
}

export interface QCRecord {
  id: string;
  jobId: string;
  inspectorId: string;
  mode: "live" | "recheck";
  status: "pass" | "fail" | "hold";
  checklist: Record<string, boolean>;
  notes: string;
  photos: string[];
  createdAt: Date;
}

export enum ProductionState {
  STOPPED = "STOPPED",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
}

export enum SpoilageReason {
  DAMAGED = "Damaged",
  MISPRINT = "Misprint",
  HOLE_SPOTTED = "Hole Spotted",
  MISSING_ITEM = "Missing Item",
  OTHER = "Other",
}

export enum HoldReason {
  REGISTRATION_ISSUE = "Registration issue",
  WRONG_GARMENTS = "Wrong garments",
  WRONG_ART = "Wrong art",
  MISSING_SCREENS = "Missing screens",
  OTHER = "Other",
}

export interface ProductionLog {
  id: string;
  jobId: string;
  operatorId: string;
  state: ProductionState;
  timestamp: Date;
  machineId?: string;
  notes?: string;
  photos?: string[];
  spoilageData?: SpoilageData;
  holdData?: HoldData;
}

export interface SpoilageData {
  lineItemId?: string;
  qtyAffected: number;
  reason: SpoilageReason;
  notes?: string;
  photos?: string[];
}

export interface HoldData {
  reason: HoldReason;
  notes: string;
  photos?: string[];
  supervisorNotified: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface TestPrintApproval {
  id: string;
  jobId: string;
  operatorId: string;
  supervisorId?: string;
  photo: string;
  status: "pending" | "approved" | "denied";
  supervisorNotes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface LineItem {
  id: string;
  jobId: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  description?: string;
}

export interface ImprintMockup {
  id: string;
  jobId: string;
  imageUrl: string;
  position: string;
  colors: string[];
  description?: string;
}