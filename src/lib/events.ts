import { EventEmitter } from "node:events";

// Shared event bus for communication between API routes and Socket.io handlers.
// Both run in the same Node.js process (custom server.js), so this works without Redis.
export const appEvents = new EventEmitter();
appEvents.setMaxListeners(50);
