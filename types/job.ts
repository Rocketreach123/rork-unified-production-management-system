export enum JobStatus {
  NEW = "NEW",
  IN_PRODUCTION = "IN_PRODUCTION",
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