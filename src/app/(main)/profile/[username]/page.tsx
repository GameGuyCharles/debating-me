"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  totalDebates: number;
  wins: number;
  losses: number;
  draws: number;
  avgScore: number;
  createdAt: string;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Exact username lookup to get ID
      const searchRes = await fetch(`/api/users?exact=${encodeURIComponent(username)}`);
      if (searchRes.ok) {
        const users = await searchRes.json();
        if (users.length > 0) {
          const profileRes = await fetch(`/api/users/${users[0].id}`);
          if (profileRes.ok) {
            setProfile(await profileRes.json());
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [username]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <span className="text-5xl">😕</span>
        <p className="text-muted-foreground text-lg">User not found.</p>
        <Link href="/lobby">
          <Button variant="outline">Browse Lobby</Button>
        </Link>
      </div>
    );
  }

  const winRate =
    profile.totalDebates > 0
      ? ((profile.wins / profile.totalDebates) * 100).toFixed(0)
      : "0";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Profile header */}
      <Card className="mb-6 border-border/50 shadow-xl overflow-hidden">
        {/* Gradient banner */}
        <div className="h-24 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-80" />
        <CardContent className="-mt-12 pb-6">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 font-bold">
                {(profile.displayName || profile.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold truncate">
                  {profile.displayName || profile.username}
                </h1>
                {profile.role === "moderator" && (
                  <Badge className="bg-primary/10 text-primary border-0">
                    🛡️ Moderator
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm leading-relaxed">{profile.bio}</p>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span>📅 Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard
          label="Debates"
          value={String(profile.totalDebates)}
          emoji="🎯"
          gradient="from-primary/5 to-purple-500/5"
        />
        <StatCard
          label="Wins"
          value={String(profile.wins)}
          emoji="🏆"
          gradient="from-green-500/5 to-emerald-500/5"
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          emoji="📊"
          gradient="from-blue-500/5 to-cyan-500/5"
        />
        <StatCard
          label="Avg Score"
          value={profile.avgScore.toFixed(1)}
          emoji="⭐"
          gradient="from-amber-500/5 to-orange-500/5"
        />
      </div>

      {/* Record */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📋</span> Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-green-400 font-mono font-bold text-lg">
                {profile.wins}
              </span>
              <span className="text-xs text-muted-foreground">wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-red-400 font-mono font-bold text-lg">
                {profile.losses}
              </span>
              <span className="text-xs text-muted-foreground">losses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground font-mono font-bold text-lg">
                {profile.draws}
              </span>
              <span className="text-xs text-muted-foreground">draws</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenge CTA */}
      <div className="mt-8 text-center">
        <Link href="/debate/new">
          <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-lg shadow-primary/20 font-semibold px-8">
            ⚔️ Challenge {profile.username} to a Debate
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  emoji,
  gradient,
}: {
  label: string;
  value: string;
  emoji: string;
  gradient: string;
}) {
  return (
    <Card className={`border-border/50 shadow-md bg-gradient-to-br ${gradient}`}>
      <CardContent className="pt-5 pb-4 text-center">
        <span className="text-lg block mb-1">{emoji}</span>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
