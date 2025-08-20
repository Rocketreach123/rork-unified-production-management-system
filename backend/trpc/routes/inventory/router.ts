import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";
import {
  consignmentLogCreateSchema,
  consignmentLogSchema,
  inventoryItemCreateSchema,
  inventoryItemSchema,
  inventoryMovementCreateSchema,
  inventoryMovementSchema,
  poCreateSchema,
  poLineItemSchema,
  purchaseOrderSchema,
  subscriptionCreateSchema,
  subscriptionSchema,
  POStatusEnum,
  SubscriptionFrequencyEnum,
} from "@/types/inventory";

const id = () => (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const now = () => new Date().toISOString();

type Store = {
  items: any[];
  movements: any[];
  pos: any[];
  lineItems: any[];
  subs: any[];
  consign: any[];
};

const store = (): Store => {
  const g = globalThis as unknown as { __inventory?: Store };
  if (!g.__inventory) {
    g.__inventory = { items: [], movements: [], pos: [], lineItems: [], subs: [], consign: [] };
  }
  return g.__inventory;
};

export default createTRPCRouter({
  // Inventory Items
  createItem: publicProcedure
    .input(inventoryItemCreateSchema)
    .mutation(({ input }) => {
      const s = store();
      const rec = { id: id(), ...input, created_at: now(), updated_at: now() };
      s.items.push(rec);
      return inventoryItemSchema.parse(rec);
    }),

  listItems: publicProcedure
    .input(z.object({ query: z.string().optional(), category: z.string().optional() }).optional())
    .query(({ input }) => {
      const s = store();
      let out = s.items;
      if (input?.query) out = out.filter((i) => i.name.toLowerCase().includes(input.query!.toLowerCase()));
      if (input?.category) out = out.filter((i) => i.category === input.category);
      return out.map((i) => inventoryItemSchema.parse(i));
    }),

  // Movements
  addMovement: publicProcedure
    .input(inventoryMovementCreateSchema)
    .mutation(({ input }) => {
      const s = store();
      const mv = { id: id(), ...input, created_at: now() };
      s.movements.push(mv);
      // naive on-hand calculation not stored; clients can aggregate
      return inventoryMovementSchema.parse(mv);
    }),

  listMovements: publicProcedure
    .input(z.object({ inventory_item_id: z.string().optional() }).optional())
    .query(({ input }) => {
      const s = store();
      let out = s.movements;
      if (input?.inventory_item_id) out = out.filter((m) => m.inventory_item_id === input.inventory_item_id);
      return out.map((m) => inventoryMovementSchema.parse(m));
    }),

  // Purchase Orders
  createPO: publicProcedure
    .input(poCreateSchema)
    .mutation(({ input }) => {
      const s = store();
      const poId = id();
      const po = {
        id: poId,
        po_number: `PO-${String(s.pos.length + 1).padStart(5, "0")}`,
        vendor_id: input.vendor_id,
        status: POStatusEnum.enum.draft,
        created_by: input.created_by,
        created_at: now(),
        updated_at: now(),
      };
      s.pos.push(po);
      const hook = process.env.EXPO_PUBLIC_TEAMS_INVENTORY_WEBHOOK;
      if (hook) {
        try {
          fetch(hook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "@type": "MessageCard",
              "@context": "https://schema.org/extensions",
              summary: "New PO Created",
              themeColor: "0078D4",
              title: `✉ PO ${po.po_number} created`,
            }),
          });
        } catch (e) {
          console.log("teams hook error", e);
        }
      }
      for (const item of input.items) {
        const li = {
          id: id(),
          purchase_order_id: poId,
          inventory_item_id: item.inventory_item_id ?? null,
          description: item.description,
          quantity_ordered: item.quantity_ordered,
          quantity_received: 0,
          unit_cost: item.unit_cost,
        };
        s.lineItems.push(li);
      }
      return {
        po: purchaseOrderSchema.parse(po),
        items: s.lineItems.filter((li) => li.purchase_order_id === poId).map((li) => poLineItemSchema.parse(li)),
      };
    }),

  listPOs: publicProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input }) => {
      const s = store();
      let out = s.pos;
      if (input?.status) out = out.filter((p) => p.status === input.status);
      return out.map((p) => purchaseOrderSchema.parse(p));
    }),

  listPOLineItems: publicProcedure
    .input(z.object({ po_id: z.string() }))
    .query(({ input }) => {
      const s = store();
      return s.lineItems.filter((li) => li.purchase_order_id === input.po_id).map((li) => poLineItemSchema.parse(li));
    }),

  receivePOLine: publicProcedure
    .input(z.object({ po_id: z.string(), line_item_id: z.string(), quantity_received: z.number().int().positive(), received_by: z.string() }))
    .mutation(({ input }) => {
      const s = store();
      const liIdx = s.lineItems.findIndex((li) => li.id === input.line_item_id && li.purchase_order_id === input.po_id);
      if (liIdx === -1) throw new Error("Line item not found");
      const li = s.lineItems[liIdx];
      const newReceived = Math.min(li.quantity_ordered, li.quantity_received + input.quantity_received);
      s.lineItems[liIdx] = { ...li, quantity_received: newReceived };

      // movement
      if (li.inventory_item_id) {
        const mv = {
          id: id(),
          inventory_item_id: li.inventory_item_id,
          quantity: input.quantity_received,
          type: "add" as const,
          reason: `PO ${input.po_id} receive` as const,
          related_po_id: input.po_id,
          created_by: input.received_by,
          created_at: now(),
        };
        s.movements.push(mv);
        const hook = process.env.EXPO_PUBLIC_TEAMS_INVENTORY_WEBHOOK;
        if (hook) {
          try {
            fetch(hook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                summary: "Item Received",
                themeColor: "2EB886",
                title: `📦 Received ${input.quantity_received} units`,
                sections: [
                  { facts: [
                    { name: "PO", value: input.po_id },
                    { name: "Line", value: input.line_item_id },
                  ]}
                ]
              }),
            });
          } catch (e) {
            console.log("teams hook error", e);
          }
        }
      }

      // update PO status
      const poIdx = s.pos.findIndex((p) => p.id === input.po_id);
      if (poIdx !== -1) {
        const po = s.pos[poIdx];
        const its = s.lineItems.filter((x) => x.purchase_order_id === input.po_id);
        const allRecv = its.every((x) => x.quantity_received >= x.quantity_ordered);
        const anyRecv = its.some((x) => x.quantity_received > 0);
        const status = allRecv ? POStatusEnum.enum.received : anyRecv ? POStatusEnum.enum.partial_received : po.status;
        s.pos[poIdx] = { ...po, status, updated_at: now() };
      }

      return {
        line: poLineItemSchema.parse(s.lineItems[liIdx]),
        po: purchaseOrderSchema.parse(s.pos.find((p) => p.id === input.po_id)!),
      };
    }),

  // Subscriptions
  createSubscription: publicProcedure
    .input(subscriptionCreateSchema)
    .mutation(({ input }) => {
      const s = store();
      const sub = {
        id: id(),
        ...input,
        active: true,
        created_at: now(),
        updated_at: now(),
      };
      s.subs.push(sub);
      return subscriptionSchema.parse(sub);
    }),

  listSubscriptions: publicProcedure
    .query(() => {
      const s = store();
      return s.subs.map((x) => subscriptionSchema.parse(x));
    }),

  // Consignment
  logConsignmentUse: publicProcedure
    .input(consignmentLogCreateSchema)
    .mutation(({ input }) => {
      const s = store();
      const rec = { id: id(), ...input, created_at: now() };
      s.consign.push(rec);
      return consignmentLogSchema.parse(rec);
    }),

  listConsignment: publicProcedure
    .input(z.object({ inventory_item_id: z.string().optional() }).optional())
    .query(({ input }) => {
      const s = store();
      let out = s.consign;
      if (input?.inventory_item_id) out = out.filter((c) => c.inventory_item_id === input.inventory_item_id);
      return out.map((c) => consignmentLogSchema.parse(c));
    }),

  // Utilities
  onHand: publicProcedure
    .input(z.object({ inventory_item_id: z.string() }))
    .query(({ input }) => {
      const s = store();
      const mvs = s.movements.filter((m) => m.inventory_item_id === input.inventory_item_id);
      const qty = mvs.reduce((acc, m) => acc + (m.type === "add" ? m.quantity : m.type === "remove" ? -m.quantity : 0), 0);
      return { inventory_item_id: input.inventory_item_id, onHand: qty };
    }),

  // Scheduler-like endpoints for demo
  runAutoReorder: publicProcedure
    .mutation(() => {
      const s = store();
      const created: any[] = [];
      for (const item of s.items) {
        const mvs = s.movements.filter((m) => m.inventory_item_id === item.id);
        const onHand = mvs.reduce((acc, m) => acc + (m.type === "add" ? m.quantity : m.type === "remove" ? -m.quantity : 0), 0);
        if (onHand < (item.reorder_threshold ?? 0)) {
          const existsOpen = s.pos.some((p) => p.vendor_id === item.vendor_id && (p.status === POStatusEnum.enum.draft || p.status === POStatusEnum.enum.submitted));
          if (!existsOpen && item.vendor_id && item.max_threshold != null) {
            const qty = Math.max(0, item.max_threshold - onHand);
            const poId = id();
            const po = {
              id: poId,
              po_number: `PO-${String(s.pos.length + 1).padStart(5, "0")}`,
              vendor_id: item.vendor_id,
              status: POStatusEnum.enum.draft,
              created_by: "system",
              created_at: now(),
              updated_at: now(),
            };
            s.pos.push(po);
            const li = {
              id: id(),
              purchase_order_id: poId,
              inventory_item_id: item.id,
              description: item.name,
              quantity_ordered: qty,
              quantity_received: 0,
              unit_cost: 0,
            };
            s.lineItems.push(li);
            created.push({ po, line: li });
            const hook = process.env.EXPO_PUBLIC_TEAMS_INVENTORY_WEBHOOK;
            if (hook) {
              try {
                fetch(hook, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    "@type": "MessageCard",
                    "@context": "https://schema.org/extensions",
                    summary: "Low Inventory Reorder",
                    themeColor: "FFA500",
                    title: `🚨 Auto-PO ${po.po_number} for ${item.name}`,
                  }),
                });
              } catch (e) {
                console.log("teams hook error", e);
              }
            }
          }
        }
      }
      return { created: created.length, details: created };
    }),

  runSubscriptions: publicProcedure
    .mutation(() => {
      const s = store();
      const today = new Date().toISOString().slice(0, 10);
      const created: any[] = [];
      for (const sub of s.subs.filter((x) => x.active)) {
        if (sub.next_order_date <= today) {
          const poId = id();
          const po = {
            id: poId,
            po_number: `PO-${String(s.pos.length + 1).padStart(5, "0")}`,
            vendor_id: s.items.find((it) => it.id === sub.inventory_item_id)?.vendor_id ?? "",
            status: POStatusEnum.enum.draft,
            created_by: "system",
            created_at: now(),
            updated_at: now(),
          };
          s.pos.push(po);
          const item = s.items.find((it) => it.id === sub.inventory_item_id);
          const li = {
            id: id(),
            purchase_order_id: poId,
            inventory_item_id: sub.inventory_item_id,
            description: item?.name ?? "Subscription Item",
            quantity_ordered: sub.quantity,
            quantity_received: 0,
            unit_cost: 0,
          };
          s.lineItems.push(li);
          const hook = process.env.EXPO_PUBLIC_TEAMS_INVENTORY_WEBHOOK;
          if (hook) {
            try {
              fetch(hook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  "@type": "MessageCard",
                  "@context": "https://schema.org/extensions",
                  summary: "Subscription PO",
                  themeColor: "4CAF50",
                  title: `✔️ Subscription PO ${po.po_number} created`,
                }),
              });
            } catch (e) {
              console.log("teams hook error", e);
            }
          }
          // advance date
          const d = new Date(sub.next_order_date);
          if (sub.frequency === SubscriptionFrequencyEnum.enum.weekly) d.setDate(d.getDate() + 7);
          else if (sub.frequency === SubscriptionFrequencyEnum.enum.biweekly) d.setDate(d.getDate() + 14);
          else d.setMonth(d.getMonth() + 1);
          sub.next_order_date = d.toISOString().slice(0, 10);
          sub.updated_at = now();
          created.push({ po, li, sub });
        }
      }
      return { created: created.length, details: created };
    }),
});
