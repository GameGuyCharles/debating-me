"use client";

import { useEffect, useState, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types/socket-events";

interface SpectatorChatProps {
  debateId: string;
}

export function SpectatorChat({ debateId }: SpectatorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing chat messages
    async function loadMessages() {
      const res = await fetch(`/api/chat/${debateId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.map((m: Record<string, unknown>) => ({
            id: m.id,
            userId: m.user_id,
            username: m.username,
            avatarUrl: m.avatar_url,
            content: m.content,
            createdAt: m.created_at,
          }))
        );
      }
    }
    loadMessages();

    const socket = getSocket();

    socket.on("chat:message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("chat:message");
    };
  }, [debateId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const socket = getSocket();
    socket.emit("chat:send", { debateId, content: input.trim() });
    setInput("");
  }

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Live Chat</h3>
        <p className="text-xs text-muted-foreground">
          {messages.length} messages
        </p>
      </div>

      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="flex flex-col gap-2 py-3">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-primary">
                {msg.username}
              </span>
              <span className="ml-1 text-foreground">{msg.content}</span>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              No messages yet. Be the first to comment!
            </p>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t px-4 py-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="text-sm"
        />
        <Button type="submit" size="sm" disabled={!input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
