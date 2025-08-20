import { z } from "zod";

export const InventoryCategoryEnum = z.enum([
  "ink",
  "thread",
  "vinyl",
  "chemical",
  "paper",
  "other",
]);

export const InventoryUnitEnum = z.enum([
  "gal",
  "qt",
  "lb",
  "oz",
  "roll",
  "box",
  "each",
]);

export const MovementTypeEnum = z.enum(["add", "remove", "adjust"]);

export const POStatusEnum = z.enum([
  "draft",
  "submitted",
  "partial_received",
  "received",
  "closed",
]);

export const SubscriptionFrequencyEnum = z.enum([
  "weekly",
  "biweekly",
  "monthly",
]);

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional().nullable(),
  category: InventoryCategoryEnum,
  unit: InventoryUnitEnum,
  location: z.string(),
  reorder_threshold: z.number().int().nonnegative(),
  max_threshold: z.number().int().nonnegative().optional().nullable(),
  is_subscription: z.boolean().default(false),
  is_consignment: z.boolean().default(false),
  vendor_id: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const inventoryItemCreateSchema = z.object({
  name: z.string(),
  sku: z.string().optional().nullable(),
  category: InventoryCategoryEnum,
  unit: InventoryUnitEnum,
  location: z.string(),
  reorder_threshold: z.number().int().nonnegative().default(0),
  max_threshold: z.number().int().nonnegative().optional().nullable(),
  is_subscription: z.boolean().optional().default(false),
  is_consignment: z.boolean().optional().default(false),
  vendor_id: z.string().optional().nullable(),
});

export const inventoryMovementSchema = z.object({
  id: z.string(),
  inventory_item_id: z.string(),
  quantity: z.number(),
  type: MovementTypeEnum,
  reason: z.string().optional().nullable(),
  related_po_id: z.string().optional().nullable(),
  created_by: z.string(),
  created_at: z.string(),
});

export const inventoryMovementCreateSchema = z.object({
  inventory_item_id: z.string(),
  quantity: z.number(),
  type: MovementTypeEnum,
  reason: z.string().optional().nullable(),
  related_po_id: z.string().optional().nullable(),
  created_by: z.string(),
});

export const purchaseOrderSchema = z.object({
  id: z.string(),
  po_number: z.string(),
  vendor_id: z.string(),
  status: POStatusEnum,
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const poLineItemSchema = z.object({
  id: z.string(),
  purchase_order_id: z.string(),
  inventory_item_id: z.string().optional().nullable(),
  description: z.string(),
  quantity_ordered: z.number().int(),
  quantity_received: z.number().int().default(0),
  unit_cost: z.number(),
});

export const poCreateSchema = z.object({
  vendor_id: z.string(),
  created_by: z.string(),
  items: z.array(
    z.object({
      inventory_item_id: z.string().optional().nullable(),
      description: z.string(),
      quantity_ordered: z.number().int().positive(),
      unit_cost: z.number().nonnegative(),
    })
  ),
});

export const poReceiveSchema = z.object({
  po_id: z.string(),
  line_item_id: z.string(),
  quantity_received: z.number().int().positive(),
  received_by: z.string(),
});

export const subscriptionSchema = z.object({
  id: z.string(),
  inventory_item_id: z.string(),
  frequency: SubscriptionFrequencyEnum,
  quantity: z.number().int().positive(),
  next_order_date: z.string(),
  active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

export const subscriptionCreateSchema = z.object({
  inventory_item_id: z.string(),
  frequency: SubscriptionFrequencyEnum,
  quantity: z.number().int().positive(),
  next_order_date: z.string(),
});

export const consignmentLogSchema = z.object({
  id: z.string(),
  inventory_item_id: z.string(),
  quantity_used: z.number().int().positive(),
  used_on: z.string(),
  used_by: z.string(),
  created_at: z.string(),
});

export const consignmentLogCreateSchema = z.object({
  inventory_item_id: z.string(),
  quantity_used: z.number().int().positive(),
  used_on: z.string(),
  used_by: z.string(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type POLineItem = z.infer<typeof poLineItemSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type ConsignmentLog = z.infer<typeof consignmentLogSchema>;
export type POStatus = z.infer<typeof POStatusEnum>;
