"use client";
import { SessionProvider } from "next-auth/react";
import PomodoroProvider from "@/components/PomodoroProvider";
import PomodoroFloating from "@/components/PomodoroFloating";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PomodoroProvider>
        {children}
        <PomodoroFloating />
      </PomodoroProvider>
    </SessionProvider>
  );
}
