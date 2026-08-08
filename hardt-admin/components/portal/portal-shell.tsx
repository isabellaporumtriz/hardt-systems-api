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
    <div className="portal-root min-h-screen bg-[#f6f7fb] text-[#171331]">
      <PortalSidebar />

      <div className="min-h-screen lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-[#ebeaf2] bg-white/85 backdrop-blur-xl">
          <div className="flex h-[84px] items-center justify-between px-5 sm:px-8 xl:px-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ebeaf2] bg-white text-[#27145f] shadow-sm lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>

              <div className="hidden items-center gap-3 rounded-2xl border border-[#ebeaf2] bg-[#fafafe] px-4 py-2.5 md:flex">
                <Search
                  size={18}
                  className="text-[#8a8799]"
                />

                <span className="text-sm text-[#9996a8]">
                  Buscar no Hardt OS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ebeaf2] bg-white text-[#37206f] shadow-sm transition hover:border-violet-200 hover:bg-violet-50"
                aria-label="Notificações"
              >
                <Bell size={20} />

                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                  2
                </span>
              </button>

              <div className="hidden h-10 w-px bg-[#ebeaf2] sm:block" />

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-sm font-bold text-white shadow-[0_10px_28px_rgba(124,58,237,0.28)]">
                  {initials || "CL"}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-[#211942]">
                    {clientName}
                  </p>

                  <p className="mt-0.5 text-xs text-[#8b8799]">
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