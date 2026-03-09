"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Avoid hydration mismatch — render a placeholder with same dimensions
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled>
        <span className="text-base">🌙</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 p-0 hover:bg-accent/50 transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="text-base">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
    </Button>
  );
}
