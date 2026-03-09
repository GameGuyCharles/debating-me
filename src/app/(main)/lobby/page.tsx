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

interface Challenge {
  id: string;
  topic: string;
  sender_side: string;
  username: string;
  display_name: string | null;
  avg_score: string;
  total_debates: number;
  turn_time_secs: number;
  review_time_secs: number;
  total_turns: number;
  category_name: string | null;
  created_at: string;
}

export default function LobbyPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, [category]);

  async function loadChallenges(topic?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (category) params.set("category", category);

    const res = await fetch(`/api/lobby?${params}`);
    if (res.ok) {
      setChallenges(await res.json());
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadChallenges(search || undefined);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Open Debates ⚔️</h1>
          <p className="text-muted-foreground mt-1">
            Find a debate looking for an opponent
          </p>
        </div>
        <Link href="/debate/new">
          <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-md shadow-primary/20">
            Create Debate
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
        <p className="text-muted-foreground">Loading debates...</p>
      ) : challenges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <span className="text-5xl block mb-4">🏟️</span>
            <p className="text-muted-foreground text-base">
              No open debates right now. Be the first to create one!
            </p>
            <Link href="/debate/new">
              <Button className="mt-4 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90">
                Create a Debate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <Link key={challenge.id} href={`/debate/invite/${challenge.id}`}>
              <Card className="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {challenge.topic}
                    </CardTitle>
                    {challenge.category_name && (
                      <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
                        {challenge.category_name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        @{challenge.username}
                      </span>
                      <Badge className={
                        challenge.sender_side === "for"
                          ? "bg-green-500/10 text-green-400 border-0"
                          : "bg-red-500/10 text-red-400 border-0"
                      }>
                        {challenge.sender_side === "for" ? "For" : "Against"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        {Math.floor(challenge.turn_time_secs / 60)}min/turn
                      </span>
                      <span>{challenge.total_turns} turns</span>
                      <span>
                        {challenge.total_debates} debates
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
