"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { connectSocket } from "@/lib/socket";
import { toast } from "sonner";

/**
 * Global socket connection for receiving real-time notifications.
 * Connects when user is authenticated, listens for invite/debate events.
 */
export function SocketNotifications() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const initRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (initRef.current) return;
    initRef.current = true;

    const socket = connectSocket();

    socket.on("invite:accepted", (data: { debateId: string; topic: string; acceptedBy: string }) => {
      toast.success(`${data.acceptedBy} accepted your debate!`, {
        description: data.topic,
        duration: 15000,
        action: {
          label: "Join Debate",
          onClick: () => router.push(`/debate/${data.debateId}`),
        },
      });

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push(`/debate/${data.debateId}`);
      }, 3000);
    });

    socket.on("invite:received", () => {
      toast.info("You received a new debate invite!", {
        action: {
          label: "View",
          onClick: () => router.push("/dashboard"),
        },
      });
    });

    return () => {
      // Don't disconnect — keep alive for continued notifications
    };
  }, [status, session, router]);

  return null;
}
