import { z } from "zod";

export type QCService = "Screen Printing" | "Embroidery" | "DTG" | "Transfers" | "Full Order";
export type QCStatus = "Pass" | "Fail" | "Recheck Needed" | "Hold";
export type QCPhase = "Good Piece" | "Failed Pieces" | "Corrections" | "Box Labels";

export interface QCForm {
  id: string;
  order_number: string;
  inspector_id: number;
  services_checked: QCService[];
  design_check?: string;
  missing_count?: number;
  fail_reasons?: string[];
  status: QCStatus;
  discrepancy_summary?: string;
  fixes_notes?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface QCFile {
  id: string;
  qc_form_id: string;
  phase: QCPhase;
  file_path: string;
  uploaded_by: number;
  uploaded_at: string;
}

export const qcFormInputSchema = z.object({
  order_number: z.string().min(1),
  inspector_id: z.number().int(),
  services_checked: z.array(z.string()),
  design_check: z.string().optional(),
  missing_count: z.number().int().nonnegative().optional(),
  fail_reasons: z.array(z.string()).optional(),
  status: z.enum(["Pass", "Fail", "Recheck Needed", "Hold"] as const),
  discrepancy_summary: z.string().optional(),
  fixes_notes: z.string().optional(),
  comments: z.string().optional(),
});

export const qcFileInputSchema = z.object({
  qc_form_id: z.string().min(1),
  phase: z.enum(["Good Piece", "Failed Pieces", "Corrections", "Box Labels"] as const),
  file_path: z.string().url(),
  uploaded_by: z.number().int(),
});
