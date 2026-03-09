// Load environment variables BEFORE anything that needs them.
// In development, dotenv with override:true is needed because Claude Code
// pre-sets ANTHROPIC_API_KEY="" in the process env. In production (Railway),
// env vars are injected directly — no .env.local file needed.
//
// Wrapped in async main() to allow dynamic import() without top-level await
// (tsx/esbuild compiles as CJS which doesn't support top-level await) and to
// avoid require() which causes ERR_REQUIRE_CYCLE_MODULE in ESM context.

import { loadEnvConfig } from "@next/env";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket-handlers/index";
import { authenticateSocket } from "./src/server/middleware/socket-auth";

async function main() {
  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local", override: true });
  }
  loadEnvConfig(process.cwd());

  const dev = process.env.NODE_ENV !== "production";
  // Railway sets RAILWAY_PUBLIC_DOMAIN; don't use HOSTNAME on Railway (it's the container ID)
  const hostname = "0.0.0.0";
  const port = parseInt(process.env.PORT || "3000", 10);

  const app = next({ dev, hostname, port });
  const handler = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authenticate all socket connections
  io.use(authenticateSocket);

  // Register event handlers
  registerSocketHandlers(io);

  httpServer.listen(port, hostname, () => {
    console.log(`> Debating.me ready on http://${hostname}:${port}`);
  });
}

main();
