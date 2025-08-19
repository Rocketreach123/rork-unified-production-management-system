import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";
import { qcFileInputSchema, qcFormInputSchema } from "@/types/qc";

const store = () => {
  const g = globalThis as unknown as {
    __qcForms?: any[];
    __qcFiles?: any[];
  };
  if (!g.__qcForms) g.__qcForms = [];
  if (!g.__qcFiles) g.__qcFiles = [];
  return g;
};

export default createTRPCRouter({
  createForm: publicProcedure
    .input(qcFormInputSchema)
    .mutation(async ({ input }) => {
      const id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      const now = new Date().toISOString();
      const g = store();
      const record = { id, ...input, created_at: now, updated_at: now };
      g.__qcForms!.push(record);

      if (input.status !== "Pass") {
        const url = process.env.EXPO_PUBLIC_TEAMS_QC_WEBHOOK;
        if (url) {
          try {
            await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                summary: "QC Failure",
                themeColor: "FF0000",
                title: "🚨 QC STATUS",
                sections: [
                  {
                    activityTitle: `**Order #${input.order_number}** QC status ${input.status}`,
                    facts: [
                      { name: "Inspector", value: String(input.inspector_id) },
                      { name: "Services", value: input.services_checked.join(", ") },
                      { name: "Missing Count", value: String(input.missing_count ?? 0) },
                      { name: "Status", value: input.status },
                    ],
                    markdown: true,
                  },
                ],
              }),
            });
          } catch (err) {
            console.log("Teams webhook error", err);
          }
        }
      }

      return record;
    }),

  listForms: publicProcedure
    .input(z.object({ order_number: z.string().optional() }).optional())
    .query(({ input }) => {
      const g = store();
      const forms = g.__qcForms!;
      if (input?.order_number) {
        return forms.filter((f) => f.order_number === input.order_number);
      }
      return forms;
    }),

  uploadFile: publicProcedure
    .input(qcFileInputSchema)
    .mutation(({ input }) => {
      const id = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      const now = new Date().toISOString();
      const g = store();
      const fileRecord = { id, ...input, uploaded_at: now };
      g.__qcFiles!.push(fileRecord);
      return fileRecord;
    }),

  listFiles: publicProcedure
    .input(z.object({ qc_form_id: z.string().optional() }).optional())
    .query(({ input }) => {
      const g = store();
      const files = g.__qcFiles!;
      if (input?.qc_form_id) {
        return files.filter((f) => f.qc_form_id === input.qc_form_id);
      }
      return files;
    }),
});
