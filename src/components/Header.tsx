"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Header({ email }: { email: string }) {
  const pathname = usePathname();
  const linkCls = (href: string) =>
    `text-sm px-3 py-1.5 rounded-lg transition-all ${
      pathname === href
        ? "bg-accent text-nav font-semibold"
        : "text-gray-300 hover:text-white hover:bg-navlight"
    }`;
  return (
    <header className="h-14 flex-shrink-0 bg-nav text-white flex items-center justify-between px-4 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">
          Task<span className="text-accent">Nest</span>
        </h1>
        <nav className="flex items-center gap-1">
          <Link href="/dashboard" className={linkCls("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/workspaces" className={linkCls("/workspaces")}>
            Workspaces
          </Link>
          <Link href="/profile" className={linkCls("/profile")}>
            Profile
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-sm text-gray-300 truncate max-w-[180px]">
          {email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm bg-navlight hover:bg-accent hover:text-nav px-3 py-1.5 rounded-lg transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
