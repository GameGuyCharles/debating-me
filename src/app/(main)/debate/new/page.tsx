"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NewDebatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: number; username: string; display_name: string | null; avg_score: number }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    username: string;
  } | null>(null);

  const [form, setForm] = useState({
    topic: "",
    senderSide: "for" as "for" | "against",
    inviteType: "direct" as "direct" | "public" | "link",
    turnTimeSecs: 300,
    reviewTimeSecs: 60,
    totalTurns: 3,
    rules: [] as string[],
  });
  const [newRule, setNewRule] = useState("");

  async function searchUsers(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setSearchResults(await res.json());
    }
  }

  function addRule() {
    if (newRule.trim().length >= 3) {
      setForm((prev) => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()],
      }));
      setNewRule("");
    }
  }

  function removeRule(index: number) {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        recipientId: selectedUser?.id,
        inviteType: selectedUser ? "direct" : form.inviteType,
      };

      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create invite");
        setLoading(false);
        return;
      }

      if (data.invite_code) {
        // Link invite — show the shareable link
        router.push(`/debate/invite/${data.id}`);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Start a Debate ✨</h1>
        <p className="mt-1 text-muted-foreground">
          Pick a topic, choose your side, and challenge someone
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Topic */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💡</span> Topic
            </CardTitle>
            <CardDescription>
              What will you be debating about?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              placeholder="e.g., Should college education be free for all citizens?"
              value={form.topic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, topic: e.target.value }))
              }
              required
              minLength={5}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            <div>
              <Label className="text-sm font-medium">Your Side</Label>
              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant={form.senderSide === "for" ? "default" : "outline"}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, senderSide: "for" }))
                  }
                  className={
                    form.senderSide === "for"
                      ? "bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20"
                      : "hover:border-green-500/50 hover:text-green-400"
                  }
                >
                  👍 For
                </Button>
                <Button
                  type="button"
                  variant={
                    form.senderSide === "against" ? "default" : "outline"
                  }
                  onClick={() =>
                    setForm((prev) => ({ ...prev, senderSide: "against" }))
                  }
                  className={
                    form.senderSide === "against"
                      ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20"
                      : "hover:border-red-500/50 hover:text-red-400"
                  }
                >
                  👎 Against
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opponent */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🎯</span> Opponent
            </CardTitle>
            <CardDescription>
              Search for a user or post publicly
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.inviteType === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setForm((prev) => ({ ...prev, inviteType: "direct" }))
                }
                className={
                  form.inviteType === "direct"
                    ? "bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                    : ""
                }
              >
                👤 Direct
              </Button>
              <Button
                type="button"
                variant={form.inviteType === "public" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setForm((prev) => ({ ...prev, inviteType: "public" }));
                  setSelectedUser(null);
                }}
                className={
                  form.inviteType === "public"
                    ? "bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                    : ""
                }
              >
                🏟️ Public
              </Button>
              <Button
                type="button"
                variant={form.inviteType === "link" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setForm((prev) => ({ ...prev, inviteType: "link" }));
                  setSelectedUser(null);
                }}
                className={
                  form.inviteType === "link"
                    ? "bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                    : ""
                }
              >
                🔗 Link
              </Button>
            </div>

            {form.inviteType === "direct" && (
              <div>
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {searchResults.length > 0 && !selectedUser && (
                  <div className="mt-2 rounded-xl border border-border/50 overflow-hidden">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                        onClick={() => {
                          setSelectedUser({
                            id: user.id,
                            username: user.username,
                          });
                          setSearchQuery(user.username);
                          setSearchResults([]);
                        }}
                      >
                        <span className="font-medium">@{user.username}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Avg: {user.avg_score}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <Badge className="bg-primary/10 text-primary border-0">
                      ⚔️ Challenging @{selectedUser.username}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery("");
                      }}
                      className="ml-auto text-xs"
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            )}

            {form.inviteType === "public" && (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
                🏟️ Your challenge will appear in the public lobby for anyone to accept.
              </p>
            )}

            {form.inviteType === "link" && (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
                🔗 You&apos;ll get a shareable link to send to anyone you want to debate.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">⚙️</span> Settings
            </CardTitle>
            <CardDescription>
              Your opponent can counter-propose these settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <Label className="text-xs text-muted-foreground">Turn Time</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.turnTimeSecs / 60}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      turnTimeSecs: parseInt(e.target.value) * 60,
                    }))
                  }
                  className="mt-1 text-center text-lg font-bold border-0 bg-transparent"
                />
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <Label className="text-xs text-muted-foreground">Review Time</Label>
                <Input
                  type="number"
                  min={15}
                  max={300}
                  value={form.reviewTimeSecs}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reviewTimeSecs: parseInt(e.target.value),
                    }))
                  }
                  className="mt-1 text-center text-lg font-bold border-0 bg-transparent"
                />
                <p className="text-xs text-muted-foreground">seconds</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <Label className="text-xs text-muted-foreground">Total Turns</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.totalTurns}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      totalTurns: parseInt(e.target.value),
                    }))
                  }
                  className="mt-1 text-center text-lg font-bold border-0 bg-transparent"
                />
                <p className="text-xs text-muted-foreground">per side</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📜</span> Custom Rules
              <Badge variant="outline" className="text-xs font-normal border-border/50">Optional</Badge>
            </CardTitle>
            <CardDescription>
              Set rules both debaters must follow. AI will enforce them.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder='e.g., "No personal attacks"'
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRule())}
              />
              <Button type="button" variant="outline" onClick={addRule} className="shrink-0">
                + Add
              </Button>
            </div>
            {form.rules.length > 0 && (
              <div className="flex flex-col gap-2">
                {form.rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm"
                  >
                    <span>📌 {rule}</span>
                    <button
                      type="button"
                      onClick={() => removeRule(i)}
                      className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-lg shadow-primary/20 text-base font-semibold"
        >
          {loading
            ? "Creating..."
            : form.inviteType === "public"
              ? "🏟️ Post Challenge"
              : form.inviteType === "link"
                ? "🔗 Generate Link"
                : "⚔️ Send Challenge"}
        </Button>
      </form>
    </div>
  );
}
