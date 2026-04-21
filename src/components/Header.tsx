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
    <header className="h-14 flex-shrink-0 bg-nav text-white flex items-center justify-between gap-2 px-3 sm:px-4 shadow-md">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <h1 className="text-lg font-bold tracking-tight flex-shrink-0">
          Task<span className="text-accent">Nest</span>
        </h1>
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
          <Link href="/dashboard" className={`${linkCls("/dashboard")} whitespace-nowrap`}>
            Dashboard
          </Link>
          <Link href="/workspaces" className={`${linkCls("/workspaces")} whitespace-nowrap`}>
            Workspaces
          </Link>
          <Link href="/profile" className={`${linkCls("/profile")} whitespace-nowrap`}>
            Profile
          </Link>
          <Link href="/processes" className={`${linkCls("/processes")} whitespace-nowrap`}>
            Processes
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span className="hidden md:inline text-sm text-gray-300 truncate max-w-[180px]">
          {email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm bg-navlight hover:bg-accent hover:text-nav px-2.5 sm:px-3 py-1.5 rounded-lg transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
