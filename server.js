import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket-handlers/index.js";
import { authenticateSocket } from "./src/server/middleware/socket-auth.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
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
});
