"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { SocketNotifications } from "@/components/SocketNotifications";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("SW registration failed:", err);
      });
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <SocketNotifications />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
