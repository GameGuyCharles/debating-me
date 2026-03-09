"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/lobby", label: "Open Debates" },
  { href: "/live", label: "Live" },
  { href: "/past", label: "Past Debates" },
];

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Debating<span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">.me</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/debate/new">
            <Button size="sm" className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-md shadow-primary/20 font-medium">
              + New Debate
            </Button>
          </Link>

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || ""}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-white text-sm font-bold">
                      {(session.user.name || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${(session.user as { username?: string }).username || session.user.id}`}>
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit">Settings</Link>
                </DropdownMenuItem>
                {(session.user as { role?: string }).role === "moderator" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin Panel</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:text-destructive"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
