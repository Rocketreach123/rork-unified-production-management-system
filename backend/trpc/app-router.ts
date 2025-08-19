import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import qcRouter from "./routes/qc/router";
import testPrintRouter from "./routes/testprint/router";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  qc: qcRouter,
  testprint: testPrintRouter,
});

export type AppRouter = typeof appRouter;