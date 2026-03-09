"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { DebateRoom } from "@/components/debate/DebateRoom";
import { SpectatorView } from "@/components/spectator/SpectatorView";

/**
 * Hook to lock body scroll while on the debate page.
 * This prevents the main page from scrolling — only the
 * debate feed and chat have their own internal scroll.
 */
function useLockBodyScroll(lock: boolean) {
  useEffect(() => {
    if (!lock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lock]);
}

interface DebateData {
  id: string;
  topic: string;
  status: string;
  current_phase: string;
  current_turn: number;
  total_turns: number;
  turn_time_secs: number;
  review_time_secs: number;
  user_a_id: number;
  user_b_id: number;
  user_a_side: string;
  user_b_side: string;
  user_a_score: string;
  user_b_score: string;
  user_a_username: string;
  user_b_username: string;
  user_a_display_name: string | null;
  user_b_display_name: string | null;
  user_a_avatar_url: string | null;
  user_b_avatar_url: string | null;
  active_user_id: number | null;
  first_turn_user_id: number | null;
  spectator_count: number;
  winner_id: number | null;
  replay_slug: string | null;
}

export default function DebatePage({
  params,
}: {
  params: Promise<{ debateId: string }>;
}) {
  const { debateId } = use(params);
  const { data: session } = useSession();
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const isParticipant = debate
    ? userId === debate.user_a_id || userId === debate.user_b_id
    : false;

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/debates/${debateId}`);
      if (res.ok) {
        setDebate(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [debateId]);

  // Lock page scroll when in the debate room — only internal areas scroll
  // Must be called before any early returns to respect Rules of Hooks
  useLockBodyScroll(isParticipant);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading debate...</p>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Debate not found.</p>
      </div>
    );
  }

  if (isParticipant) {
    return <DebateRoom debate={debate} userId={userId!} />;
  }

  return <SpectatorView debate={debate} />;
}
