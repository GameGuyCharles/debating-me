"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Rule {
  id: number;
  rule_text: string;
  added_by: number;
  added_by_username: string;
}

interface Negotiation {
  id: number;
  modified_by: number;
  modified_by_username: string;
  changes_json: string;
  message: string | null;
  created_at: string;
}

interface InviteDetail {
  id: string;
  sender_id: number;
  recipient_id: number | null;
  invite_type: "direct" | "public" | "link";
  invite_code: string | null;
  topic: string;
  sender_side: "for" | "against";
  sender_username: string;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  recipient_username: string | null;
  turn_time_secs: number;
  review_time_secs: number;
  total_turns: number;
  status: string;
  last_modified_by: number | null;
  created_at: string;
  updated_at: string;
  rules: Rule[];
  negotiations: Negotiation[];
}

export default function InviteDetailPage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [copied, setCopied] = useState(false);

  // Counter-proposal form state
  const [counterForm, setCounterForm] = useState({
    turnTimeSecs: 300,
    reviewTimeSecs: 60,
    totalTurns: 3,
    message: "",
    newRule: "",
  });
  const [removeRuleIds, setRemoveRuleIds] = useState<number[]>([]);
  const [addRules, setAddRules] = useState<string[]>([]);

  useEffect(() => {
    loadInvite();
  }, [inviteId]);

  async function loadInvite() {
    try {
      const res = await fetch(`/api/invites/${inviteId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Invite not found." : "Failed to load invite.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInvite(data);
      setCounterForm({
        turnTimeSecs: data.turn_time_secs,
        reviewTimeSecs: data.review_time_secs,
        totalTurns: data.total_turns,
        message: "",
        newRule: "",
      });
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const isSender = invite?.sender_id === userId;
  const isRecipient = invite?.recipient_id === userId;
  const isParticipant = isSender || isRecipient;
  const canAccept =
    invite &&
    !isSender &&
    (invite.status === "pending" || invite.status === "counter_proposed") &&
    (invite.invite_type !== "direct" || isRecipient);
  const canCounter =
    invite &&
    isParticipant &&
    (invite.status === "pending" || invite.status === "counter_proposed") &&
    invite.last_modified_by !== userId;
  const canCancel =
    invite &&
    isSender &&
    (invite.status === "pending" || invite.status === "counter_proposed");

  async function handleAccept() {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${inviteId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite.");
        setActionLoading(false);
        return;
      }
      router.push(`/debate/${data.id}`);
    } catch {
      setError("Something went wrong.");
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to decline invite.");
        setActionLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong.");
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to cancel invite.");
        setActionLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong.");
      setActionLoading(false);
    }
  }

  async function handleCounter() {
    setActionLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      if (counterForm.turnTimeSecs !== invite?.turn_time_secs) {
        payload.turnTimeSecs = counterForm.turnTimeSecs;
      }
      if (counterForm.reviewTimeSecs !== invite?.review_time_secs) {
        payload.reviewTimeSecs = counterForm.reviewTimeSecs;
      }
      if (counterForm.totalTurns !== invite?.total_turns) {
        payload.totalTurns = counterForm.totalTurns;
      }
      if (counterForm.message.trim()) {
        payload.message = counterForm.message.trim();
      }
      if (removeRuleIds.length > 0) {
        payload.removeRuleIds = removeRuleIds;
      }
      if (addRules.length > 0) {
        payload.addRules = addRules;
      }

      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to counter-propose.");
        setActionLoading(false);
        return;
      }

      setShowCounter(false);
      setRemoveRuleIds([]);
      setAddRules([]);
      await loadInvite();
    } catch {
      setError("Something went wrong.");
    }
    setActionLoading(false);
  }

  function handleAddRule() {
    const rule = counterForm.newRule.trim();
    if (rule.length >= 3 && addRules.length < 10) {
      setAddRules([...addRules, rule]);
      setCounterForm({ ...counterForm, newRule: "" });
    }
  }

  function copyInviteLink() {
    if (invite?.invite_code) {
      const url = `${window.location.origin}/debate/join/${invite.invite_code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading invite...</p>
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

  const statusConfig: Record<string, { color: string; label: string; emoji: string }> = {
    pending: { color: "bg-amber-500/10 text-amber-400 border-0", label: "Pending", emoji: "⏳" },
    counter_proposed: { color: "bg-blue-500/10 text-blue-400 border-0", label: "Counter-Proposed", emoji: "🔄" },
    accepted: { color: "bg-green-500/10 text-green-400 border-0", label: "Accepted", emoji: "✅" },
    declined: { color: "bg-red-500/10 text-red-400 border-0", label: "Declined", emoji: "❌" },
    expired: { color: "bg-muted text-muted-foreground border-0", label: "Expired", emoji: "⏰" },
    cancelled: { color: "bg-muted text-muted-foreground border-0", label: "Cancelled", emoji: "🚫" },
  };

  const status = statusConfig[invite.status] || { color: "", label: invite.status, emoji: "" };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">Debate Invite ⚔️</h1>
          <Badge className={status.color}>
            {status.emoji} {status.label}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Shareable Link (for link invites) */}
      {invite.invite_code && isSender && (
        <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>🔗</span> Shareable Link
            </CardTitle>
            <CardDescription>
              Share this link with anyone to let them join the debate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/debate/join/${invite.invite_code}`}
                className="font-mono text-sm"
              />
              <Button
                onClick={copyInviteLink}
                variant="outline"
                className={`shrink-0 transition-all ${copied ? "bg-green-500/10 text-green-400 border-green-500/50" : ""}`}
              >
                {copied ? "✅ Copied!" : "📋 Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic & Participants */}
      <Card className="mb-4 border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg leading-snug">{invite.topic}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={invite.sender_avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 font-semibold">
                  {(invite.sender_display_name || invite.sender_username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">
                  {invite.sender_display_name || invite.sender_username}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    @{invite.sender_username}
                  </span>
                  <Badge className={
                    invite.sender_side === "for"
                      ? "bg-green-500/10 text-green-400 border-0 text-[10px] px-1.5 py-0"
                      : "bg-red-500/10 text-red-400 border-0 text-[10px] px-1.5 py-0"
                  }>
                    {invite.sender_side === "for" ? "For" : "Against"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <span className="text-xl font-bold text-muted-foreground/50">⚔️</span>
            </div>

            <div className="text-right">
              {invite.recipient_username ? (
                <div>
                  <p className="text-sm font-semibold">{invite.recipient_username}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <Badge className={
                      invite.sender_side === "for"
                        ? "bg-red-500/10 text-red-400 border-0 text-[10px] px-1.5 py-0"
                        : "bg-green-500/10 text-green-400 border-0 text-[10px] px-1.5 py-0"
                    }>
                      {invite.sender_side === "for" ? "Against" : "For"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      @{invite.recipient_username}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {invite.invite_type === "public"
                    ? "🏟️ Open challenge"
                    : invite.invite_type === "link"
                      ? "🔗 Via link"
                      : "Awaiting opponent"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debate Settings */}
      <Card className="mb-4 border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>⚙️</span> Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {Math.floor(invite.turn_time_secs / 60)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">min/turn</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {invite.review_time_secs}
              </p>
              <p className="text-xs text-muted-foreground mt-1">sec review</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {invite.total_turns}
              </p>
              <p className="text-xs text-muted-foreground mt-1">turns</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      {invite.rules.length > 0 && (
        <Card className="mb-4 border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>📜</span> Custom Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {invite.rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-start justify-between rounded-xl border border-border/50 bg-muted/30 p-3 text-sm"
                >
                  <span>📌 {rule.rule_text}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    by @{rule.added_by_username}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Negotiation History */}
      {invite.negotiations.length > 0 && (
        <Card className="mb-6 border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>🔄</span> Negotiation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invite.negotiations.map((nego) => {
                let changes: Record<string, { old: unknown; new: unknown }> = {};
                try {
                  changes = JSON.parse(nego.changes_json);
                } catch {
                  /* ignore parse errors */
                }

                return (
                  <div
                    key={nego.id}
                    className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-primary">
                        @{nego.modified_by_username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(nego.created_at).toLocaleString()}
                      </span>
                    </div>
                    {nego.message && (
                      <p className="mb-2 rounded-lg bg-muted/40 px-3 py-2 italic text-muted-foreground">
                        &ldquo;{nego.message}&rdquo;
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(changes).map(([key, val]) => {
                        const label = key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        return (
                          <Badge key={key} variant="outline" className="text-xs border-primary/30 text-primary">
                            {label}: {String(val.old)} → {String(val.new)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Counter-proposal Form */}
      {showCounter && (
        <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>🔄</span> Counter-Propose
            </CardTitle>
            <CardDescription>
              Modify the settings you&apos;d like to change
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                  <Label htmlFor="turnTime" className="text-xs text-muted-foreground">Turn (min)</Label>
                  <Input
                    id="turnTime"
                    type="number"
                    min={1}
                    max={30}
                    value={Math.floor(counterForm.turnTimeSecs / 60)}
                    onChange={(e) =>
                      setCounterForm({
                        ...counterForm,
                        turnTimeSecs: parseInt(e.target.value) * 60 || 300,
                      })
                    }
                    className="mt-1 text-center font-bold border-0 bg-transparent"
                  />
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                  <Label htmlFor="reviewTime" className="text-xs text-muted-foreground">Review (sec)</Label>
                  <Input
                    id="reviewTime"
                    type="number"
                    min={15}
                    max={300}
                    value={counterForm.reviewTimeSecs}
                    onChange={(e) =>
                      setCounterForm({
                        ...counterForm,
                        reviewTimeSecs: parseInt(e.target.value) || 60,
                      })
                    }
                    className="mt-1 text-center font-bold border-0 bg-transparent"
                  />
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                  <Label htmlFor="totalTurns" className="text-xs text-muted-foreground">Turns</Label>
                  <Input
                    id="totalTurns"
                    type="number"
                    min={1}
                    max={10}
                    value={counterForm.totalTurns}
                    onChange={(e) =>
                      setCounterForm({
                        ...counterForm,
                        totalTurns: parseInt(e.target.value) || 3,
                      })
                    }
                    className="mt-1 text-center font-bold border-0 bg-transparent"
                  />
                </div>
              </div>

              {/* Remove existing rules */}
              {invite.rules.length > 0 && (
                <div>
                  <Label className="text-sm">Remove Rules</Label>
                  <div className="mt-2 space-y-1">
                    {invite.rules.map((rule) => (
                      <label
                        key={rule.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={removeRuleIds.includes(rule.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRemoveRuleIds([...removeRuleIds, rule.id]);
                            } else {
                              setRemoveRuleIds(
                                removeRuleIds.filter((id) => id !== rule.id)
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span
                          className={
                            removeRuleIds.includes(rule.id)
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {rule.rule_text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new rules */}
              <div>
                <Label className="text-sm">Add Rules</Label>
                {addRules.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {addRules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span>📌 {rule}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAddRules(addRules.filter((_, j) => j !== i))
                          }
                          className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="e.g., No personal attacks"
                    value={counterForm.newRule}
                    onChange={(e) =>
                      setCounterForm({ ...counterForm, newRule: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRule}
                    className="shrink-0"
                  >
                    + Add
                  </Button>
                </div>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-sm">Message (optional)</Label>
                <Input
                  id="message"
                  placeholder="Explain your counter-proposal..."
                  value={counterForm.message}
                  onChange={(e) =>
                    setCounterForm({ ...counterForm, message: e.target.value })
                  }
                  maxLength={500}
                  className="mt-1"
                />
              </div>

              <Separator className="opacity-50" />

              <div className="flex gap-2">
                <Button
                  onClick={handleCounter}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-blue-500 to-primary hover:opacity-90 shadow-md shadow-blue-500/20"
                >
                  {actionLoading ? "Sending..." : "🔄 Send Counter-Proposal"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCounter(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {(invite.status === "pending" || invite.status === "counter_proposed") && (
        <div className="flex flex-wrap gap-3">
          {canAccept && (
            <Button
              onClick={handleAccept}
              disabled={actionLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-90 shadow-md shadow-green-600/20"
            >
              {actionLoading ? "Accepting..." : "⚔️ Accept & Start Debate"}
            </Button>
          )}
          {canCounter && !showCounter && (
            <Button
              variant="outline"
              onClick={() => setShowCounter(true)}
              disabled={actionLoading}
              className="hover:border-blue-500/50 hover:text-blue-400"
            >
              🔄 Counter-Propose
            </Button>
          )}
          {isRecipient && (
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={actionLoading}
            >
              Decline
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Cancel Invite
            </Button>
          )}
          {isSender && invite.last_modified_by !== userId && (
            <p className="flex items-center text-sm text-muted-foreground">
              ⏳ Waiting for your response to the counter-proposal...
            </p>
          )}
          {isSender && invite.last_modified_by === userId && !canCounter && (
            <p className="flex items-center text-sm text-muted-foreground">
              ⏳ Waiting for opponent to respond...
            </p>
          )}
        </div>
      )}

      {/* Terminal states */}
      {invite.status === "accepted" && (
        <div className="rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 text-center shadow-lg">
          <span className="text-4xl block mb-2">🎉</span>
          <p className="font-semibold text-green-400">
            This invite has been accepted!
          </p>
          <Link href="/dashboard">
            <Button variant="link" className="mt-2 text-primary">
              Go to Dashboard →
            </Button>
          </Link>
        </div>
      )}

      {(invite.status === "declined" ||
        invite.status === "expired" ||
        invite.status === "cancelled") && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
          <span className="text-4xl block mb-2">
            {invite.status === "declined" ? "😔" : invite.status === "expired" ? "⏰" : "🚫"}
          </span>
          <p className="text-muted-foreground">
            This invite has been{" "}
            {invite.status === "declined"
              ? "declined"
              : invite.status === "expired"
                ? "expired"
                : "cancelled"}
            .
          </p>
          <Link href="/dashboard">
            <Button variant="link" className="mt-2 text-primary">
              Back to Dashboard →
            </Button>
          </Link>
        </div>
      )}

      {/* Meta info */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        Created {new Date(invite.created_at).toLocaleString()} &middot;{" "}
        {invite.invite_type === "direct"
          ? "👤 Direct invite"
          : invite.invite_type === "public"
            ? "🏟️ Public challenge"
            : "🔗 Link invite"}
      </div>
    </div>
  );
}
