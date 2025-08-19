import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

const store = () => {
  const g = globalThis as unknown as {
    __testPrints?: any[];
  };
  if (!g.__testPrints) g.__testPrints = [];
  return g;
};

const submitSchema = z.object({
  jobId: z.string(),
  orderNumber: z.string(),
  operatorId: z.string().optional(),
  pressId: z.string().optional(),
  photo: z.string().url().or(z.string().startsWith("data:image/")),
});

const decisionSchema = z.object({
  id: z.string(),
  supervisorId: z.string().optional(),
  notes: z.string().optional(),
});

export default createTRPCRouter({
  submit: publicProcedure
    .input(submitSchema)
    .mutation(async ({ input }) => {
      const id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      const now = new Date().toISOString();
      const rec = {
        id,
        jobId: input.jobId,
        orderNumber: input.orderNumber,
        operatorId: input.operatorId ?? null,
        pressId: input.pressId ?? null,
        photo: input.photo,
        status: "pending" as const,
        supervisorId: null as string | null,
        supervisorNotes: "",
        submittedAt: now,
        reviewedAt: null as string | null,
      };
      const g = store();
      g.__testPrints!.push(rec);
      return rec;
    }),

  list: publicProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "denied"]).optional() }).optional())
    .query(({ input }) => {
      const g = store();
      const items = g.__testPrints!;
      if (input?.status) return items.filter((i) => i.status === input.status);
      return items;
    }),

  approve: publicProcedure
    .input(decisionSchema)
    .mutation(({ input }) => {
      const g = store();
      const items = g.__testPrints!;
      const idx = items.findIndex((i) => i.id === input.id);
      if (idx === -1) throw new Error("Not found");
      const now = new Date().toISOString();
      items[idx] = {
        ...items[idx],
        status: "approved",
        supervisorId: input.supervisorId ?? items[idx].supervisorId,
        supervisorNotes: input.notes ?? items[idx].supervisorNotes,
        reviewedAt: now,
      };
      return items[idx];
    }),

  deny: publicProcedure
    .input(decisionSchema)
    .mutation(({ input }) => {
      const g = store();
      const items = g.__testPrints!;
      const idx = items.findIndex((i) => i.id === input.id);
      if (idx === -1) throw new Error("Not found");
      const now = new Date().toISOString();
      items[idx] = {
        ...items[idx],
        status: "denied",
        supervisorId: input.supervisorId ?? items[idx].supervisorId,
        supervisorNotes: input.notes ?? items[idx].supervisorNotes,
        reviewedAt: now,
      };
      return items[idx];
    }),
});
