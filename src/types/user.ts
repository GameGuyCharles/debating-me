export interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: "user" | "moderator";
  totalDebates: number;
  wins: number;
  losses: number;
  draws: number;
  avgScore: number;
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avgScore: number;
  totalDebates: number;
}
