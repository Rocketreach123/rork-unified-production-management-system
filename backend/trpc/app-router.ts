import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import qcRouter from "./routes/qc/router";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  qc: qcRouter,
});

export type AppRouter = typeof appRouter;