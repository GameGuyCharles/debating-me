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

interface PastDebate {
  id: string;
  topic: string;
  total_turns: number;
  user_a_username: string;
  user_a_display_name: string | null;
  user_b_username: string;
  user_b_display_name: string | null;
  user_a_score: string;
  user_b_score: string;
  user_a_id: number;
  user_b_id: number;
  winner_id: number | null;
  spectator_count: number;
  completed_at: string;
  replay_slug: string | null;
  category_name: string | null;
}

export default function PastDebatesPage() {
  const [debates, setDebates] = useState<PastDebate[]>([]);
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

    const res = await fetch(`/api/debates/past?${params}`);
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
          <h1 className="text-3xl font-bold">Past Debates 📚</h1>
          <p className="text-muted-foreground mt-1">
            Browse completed debates and review the arguments
          </p>
        </div>
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
        <p className="text-muted-foreground">Loading past debates...</p>
      ) : debates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <span className="text-5xl block mb-4">📚</span>
            <p className="text-muted-foreground text-base">
              No completed debates yet. Be part of the first one!
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
            <PastDebateCard key={debate.id} debate={debate} />
          ))}
        </div>
      )}
    </div>
  );
}

function PastDebateCard({ debate }: { debate: PastDebate }) {
  const higherScoreUser =
    debate.winner_id === debate.user_a_id
      ? debate.user_a_display_name || debate.user_a_username
      : debate.winner_id === debate.user_b_id
        ? debate.user_b_display_name || debate.user_b_username
        : null;

  const timeAgo = getTimeAgo(debate.completed_at);
  const replayHref = debate.replay_slug
    ? `/debate/${debate.id}/replay`
    : `/debate/${debate.id}`;

  return (
    <Link href={replayHref}>
      <Card className="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              {debate.topic}
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground border-0 shrink-0"
            >
              Completed
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
              <span className="text-xs text-muted-foreground">
                {debate.total_turns} turns
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {debate.category_name && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary text-xs"
                  >
                    {debate.category_name}
                  </Badge>
                )}
                {higherScoreUser && (
                  <span className="text-xs text-muted-foreground">
                    Higher score: {higherScoreUser}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
