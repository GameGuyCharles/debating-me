"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvitePreview {
  id: string;
  topic: string;
  sender_side: string;
  status: string;
  invite_type: string;
  turn_time_secs: number;
  review_time_secs: number;
  total_turns: number;
  sender_username: string;
}

export default function JoinDebatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invites/join?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Invite not found or expired." : "Failed to load invite.");
          setLoading(false);
          return;
        }
        setInvite(await res.json());
      } catch {
        setError("Something went wrong.");
      }
      setLoading(false);
    }
    load();
  }, [code]);

  async function handleAccept() {
    if (!invite) return;
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${invite.id}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite.");
        setAccepting(false);
        return;
      }
      router.push(`/debate/${data.id}`);
    } catch {
      setError("Something went wrong.");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading challenge...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <span className="text-5xl">😕</span>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!invite) return null;

  const isAvailable = invite.status === "pending" || invite.status === "counter_proposed";

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4 py-8">
      <Card className="w-full border-border/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <span className="text-5xl block mb-3">⚔️</span>
          <CardTitle className="text-2xl">You&apos;ve Been Challenged!</CardTitle>
          <CardDescription className="text-base">
            @{invite.sender_username} wants to debate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center rounded-xl border border-border/50 bg-muted/30 p-5">
            <h2 className="text-lg font-bold leading-snug">{invite.topic}</h2>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">@{invite.sender_username}</span>
                <Badge className={
                  invite.sender_side === "for"
                    ? "bg-green-500/10 text-green-400 border-0"
                    : "bg-red-500/10 text-red-400 border-0"
                }>
                  {invite.sender_side === "for" ? "👍 For" : "👎 Against"}
                </Badge>
              </div>
              <span className="text-muted-foreground font-bold">vs</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">You</span>
                <Badge className={
                  invite.sender_side === "for"
                    ? "bg-red-500/10 text-red-400 border-0"
                    : "bg-green-500/10 text-green-400 border-0"
                }>
                  {invite.sender_side === "for" ? "👎 Against" : "👍 For"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {Math.floor(invite.turn_time_secs / 60)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">min/turn</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {invite.review_time_secs}
              </p>
              <p className="text-xs text-muted-foreground mt-1">sec review</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {invite.total_turns}
              </p>
              <p className="text-xs text-muted-foreground mt-1">turns</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {isAvailable ? (
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-90 shadow-lg shadow-green-600/20 text-base font-semibold py-6"
              >
                {accepting ? "Joining..." : "⚔️ Accept Challenge"}
              </Button>
              <Link href="/dashboard" className="w-full">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  Maybe Later
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center rounded-xl border border-border/50 bg-muted/30 p-4">
              <span className="text-3xl block mb-2">😔</span>
              <p className="text-muted-foreground">
                This challenge is no longer available ({invite.status}).
              </p>
              <Link href="/dashboard">
                <Button variant="link" className="mt-2 text-primary">
                  Back to Dashboard →
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
