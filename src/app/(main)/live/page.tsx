"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryFilter } from "@/components/browse/CategoryFilter";

interface LiveDebate {
  id: string;
  topic: string;
  status: string;
  current_turn: number;
  total_turns: number;
  current_phase: string;
  spectator_count: number;
  user_a_username: string;
  user_a_display_name: string | null;
  user_b_username: string;
  user_b_display_name: string | null;
  user_a_score: string;
  user_b_score: string;
  category_name: string | null;
  created_at: string;
}

export default function LiveDebatesPage() {
  const [debates, setDebates] = useState<LiveDebate[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebates();
  }, [category]);

  async function loadDebates(topic?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (category) params.set("category", category);

    const res = await fetch(`/api/debates/live?${params}`);
    if (res.ok) setDebates(await res.json());
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadDebates(search || undefined);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Debates 🔴</h1>
          <p className="text-muted-foreground mt-1">
            Watch debates happening right now
          </p>
        </div>
        <Link href="/debate/new">
          <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-md shadow-primary/20">
            Start a Debate
          </Button>
        </Link>
      </div>

      <CategoryFilter selected={category} onSelect={setCategory} />

      <form onSubmit={handleSearch} className="my-6 flex gap-3">
        <Input
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {loading ? (
        <p className="text-muted-foreground">Loading live debates...</p>
      ) : debates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <span className="text-5xl block mb-4">📡</span>
            <p className="text-muted-foreground text-base">
              No live debates right now. Check back soon or start one yourself!
            </p>
            <Link href="/debate/new">
              <Button className="mt-4 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
                Start a Debate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {debates.map((debate) => (
            <LiveDebateCard key={debate.id} debate={debate} />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveDebateCard({ debate }: { debate: LiveDebate }) {
  const phaseLabel =
    debate.status === "coin_flip"
      ? "Starting..."
      : debate.current_phase === "writing"
        ? "Writing"
        : debate.current_phase === "ai_scoring"
          ? "AI Scoring"
          : debate.current_phase === "reviewing"
            ? "Review"
            : debate.current_phase === "closing_a" || debate.current_phase === "closing_b"
              ? "Closing"
              : debate.current_phase;

  return (
    <Link href={`/debate/${debate.id}`}>
      <Card className="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              {debate.topic}
            </CardTitle>
            <Badge className="bg-red-500/10 text-red-400 border-0 shrink-0 animate-pulse">
              🔴 LIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>
                <span className="font-medium">
                  {debate.user_a_display_name || debate.user_a_username}
                </span>
                <span className="text-muted-foreground"> vs </span>
                <span className="font-medium">
                  {debate.user_b_display_name || debate.user_b_username}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-primary font-semibold text-base">
                {parseFloat(debate.user_a_score).toFixed(1)} -{" "}
                {parseFloat(debate.user_b_score).toFixed(1)}
              </span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Turn {debate.current_turn}/{debate.total_turns}</span>
                <span>{phaseLabel}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {debate.category_name && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary text-xs"
                >
                  {debate.category_name}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                👁 {debate.spectator_count} watching
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
