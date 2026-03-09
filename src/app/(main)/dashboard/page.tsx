"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Debate {
  id: string;
  topic: string;
  status: string;
  user_a_username: string;
  user_b_username: string;
  user_a_score: string;
  user_b_score: string;
  created_at: string;
}

interface Invite {
  id: string;
  topic: string;
  status: string;
  sender_id: number;
  sender_username: string;
  sender_side: string;
  recipient_username: string | null;
  turn_time_secs: number;
  total_turns: number;
  created_at: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [debatesRes, invitesRes] = await Promise.all([
          fetch("/api/debates"),
          fetch("/api/invites"),
        ]);

        if (debatesRes.ok) setDebates(await debatesRes.json());
        if (invitesRes.ok) setInvites(await invitesRes.json());
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const activeDebates = debates.filter(
    (d) => d.status === "coin_flip" || d.status === "in_progress"
  );
  const completedDebates = debates.filter((d) => d.status === "completed");
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const pendingInvites = invites.filter(
    (i) => i.status === "pending" || i.status === "counter_proposed"
  );

  async function handleCancelInvite(inviteId: string, e: React.MouseEvent) {
    e.preventDefault(); // Don't navigate to invite detail
    e.stopPropagation();
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch (err) {
      console.error("Failed to cancel invite:", err);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Hey{session?.user?.name ? `, ${session.user.name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Your debates and invitations
          </p>
        </div>
        <Link href="/debate/new">
          <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-md shadow-primary/20">
            + New Debate
          </Button>
        </Link>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📬 Pending Invites
              <Badge className="bg-primary/10 text-primary border-0">
                {pendingInvites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {pendingInvites.map((invite) => {
                const isSender = invite.sender_id === userId;
                return (
                  <Link
                    key={invite.id}
                    href={`/debate/invite/${invite.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div>
                      <p className="font-medium">{invite.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {isSender
                          ? `Sent${invite.recipient_username ? ` to @${invite.recipient_username}` : " (open challenge)"}`
                          : `From @${invite.sender_username}`}{" "}
                        &middot; {invite.total_turns} turns &middot;{" "}
                        {Math.floor(invite.turn_time_secs / 60)}min/turn
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSender && (
                        <button
                          onClick={(e) => handleCancelInvite(invite.id, e)}
                          className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Badge
                        variant={
                          invite.status === "counter_proposed"
                            ? "outline"
                            : "default"
                        }
                        className={
                          invite.status === "counter_proposed"
                            ? "border-blue-500/50 text-blue-400"
                            : isSender
                              ? "bg-primary/10 text-primary border-0"
                              : "bg-amber-500/10 text-amber-500 border-0"
                        }
                      >
                        {invite.status === "counter_proposed"
                          ? "Counter-proposed"
                          : isSender
                            ? "Sent"
                            : "Pending"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            ⚡ Active ({activeDebates.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            ✅ Completed ({completedDebates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : activeDebates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <span className="text-5xl">🎯</span>
                <CardDescription className="text-center text-base">
                  No active debates yet. Challenge someone or browse open debates!
                </CardDescription>
                <div className="flex gap-3">
                  <Link href="/debate/new">
                    <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
                      Start a Debate
                    </Button>
                  </Link>
                  <Link href="/lobby">
                    <Button variant="outline">Browse Open Debates</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeDebates.map((debate) => (
                <DebateCard key={debate.id} debate={debate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedDebates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <span className="text-4xl block mb-3">📊</span>
                <CardDescription className="text-base">
                  No completed debates yet. Your debate history will show up here!
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedDebates.map((debate) => (
                <DebateCard key={debate.id} debate={debate} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DebateCard({ debate }: { debate: Debate }) {
  return (
    <Link href={`/debate/${debate.id}`}>
      <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base leading-snug">{debate.topic}</CardTitle>
            <Badge
              className={
                debate.status === "in_progress"
                  ? "bg-green-500/10 text-green-400 border-0"
                  : debate.status === "coin_flip"
                    ? "bg-amber-500/10 text-amber-400 border-0"
                    : "bg-muted text-muted-foreground border-0"
              }
            >
              {debate.status === "in_progress"
                ? "🔴 Live"
                : debate.status === "coin_flip"
                  ? "Starting"
                  : "Completed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span>
              <span className="font-medium">{debate.user_a_username}</span>
              {" "}
              <span className="text-muted-foreground">vs</span>
              {" "}
              <span className="font-medium">{debate.user_b_username}</span>
            </span>
            <span className="font-mono text-primary font-semibold">
              {parseFloat(debate.user_a_score).toFixed(1)} - {parseFloat(debate.user_b_score).toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
