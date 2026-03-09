import type { Server, Socket } from "socket.io";
import { appEvents } from "@/lib/events";

export function handleInviteEvents(io: Server, socket: Socket) {
  // Listen for invite events from API routes via shared EventEmitter
  const onInviteCreated = ({
    recipientId,
    invite,
  }: {
    recipientId: number;
    invite: unknown;
  }) => {
    io.to(`user:${recipientId}`).emit("invite:received", invite as never);
  };

  const onInviteUpdated = ({
    targetUserId,
    invite,
  }: {
    targetUserId: number;
    invite: unknown;
  }) => {
    io.to(`user:${targetUserId}`).emit("invite:updated", invite as never);
  };

  const onInviteAccepted = ({
    senderId,
    debateId,
    topic,
    acceptedBy,
  }: {
    senderId: number;
    debateId: string;
    topic: string;
    acceptedBy: string;
  }) => {
    console.log(`[Invite] Notifying sender ${senderId}: invite accepted, debate ${debateId}`);
    io.to(`user:${senderId}`).emit("invite:accepted", {
      debateId,
      topic,
      acceptedBy,
    });
  };

  appEvents.on("invite:created", onInviteCreated);
  appEvents.on("invite:updated", onInviteUpdated);
  appEvents.on("invite:accepted", onInviteAccepted);

  // Cleanup listeners when socket disconnects
  socket.on("disconnect", () => {
    appEvents.off("invite:created", onInviteCreated);
    appEvents.off("invite:updated", onInviteUpdated);
    appEvents.off("invite:accepted", onInviteAccepted);
  });
}
