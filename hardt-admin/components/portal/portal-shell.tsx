"use client";

import {
  Bell,
  Menu,
  Search,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { PortalSidebar } from "./portal-sidebar";

type PortalShellProps = {
  children: React.ReactNode;
};

export function PortalShell({
  children,
}: PortalShellProps) {
  const { user } = useAuth();

  const clientName = user?.name ?? "Cliente";

  const initials = clientName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="portal-root min-h-screen bg-[#070709] text-white">
      <PortalSidebar />

      <div className="min-h-screen lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#09090c]/90 backdrop-blur-xl">
          <div className="flex h-[84px] items-center justify-between px-5 sm:px-8 xl:px-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white shadow-sm lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>

              <div className="hidden items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 md:flex">
                <Search
                  size={18}
                  className="text-white/40"
                />

                <span className="text-sm text-white/35">
                  Buscar no Hardt OS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/75 shadow-sm transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white"
                aria-label="Notificações"
              >
                <Bell size={20} />

                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                  2
                </span>
              </button>

              <div className="hidden h-10 w-px bg-white/[0.08] sm:block" />

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-sm font-bold text-white shadow-[0_10px_28px_rgba(124,58,237,0.28)]">
                  {initials || "CL"}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-white">
                    {clientName}
                  </p>

                  <p className="mt-0.5 text-xs text-white/40">
                    Cliente Hardt
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 sm:px-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
