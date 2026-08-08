"use client";

import {
  CreditCard,
  Download,
  Gauge,
  KeyRound,
  LogOut,
  Monitor,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import { PortalLogo } from "./portal-logo";
import { removeAccessToken } from "@/lib/auth";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/portal/dashboard",
    icon: Gauge,
  },
  {
    title: "Minhas Licenças",
    href: "/portal/licenses",
    icon: KeyRound,
  },
  {
    title: "Downloads",
    href: "/portal/downloads",
    icon: Download,
  },
  {
    title: "Dispositivos",
    href: "/portal/devices",
    icon: Monitor,
  },
  {
    title: "Cobranças",
    href: "/portal/charges",
    icon: CreditCard,
  },
  {
    title: "Perfil",
    href: "/portal/profile",
    icon: UserRound,
  },
];

function isActiveRoute(
  pathname: string,
  href: string,
): boolean {
  return (
    pathname === href
    || pathname.startsWith(`${href}/`)
  );
}

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    removeAccessToken();
    router.replace("/login");
    router.refresh();
  }


  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col overflow-hidden bg-[#16083a] text-white shadow-[24px_0_80px_rgba(31,13,74,0.18)] lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_12%,rgba(139,92,246,0.30),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(99,102,241,0.20),transparent_32%)]" />

      <div className="absolute -bottom-24 left-[-120px] h-72 w-[460px] rotate-[-10deg] rounded-[100%] border border-violet-400/15 bg-violet-500/10 blur-2xl" />

      <div className="relative flex h-full flex-col">
        <div className="px-7 pb-8 pt-8">
          <PortalLogo />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-5">
          {navigationItems.map((item) => {
            const active = isActiveRoute(
              pathname,
              item.href,
            );

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={`group flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                  active
                    ? "border-white/10 bg-white/14 text-white shadow-[0_16px_40px_rgba(76,29,149,0.24)]"
                    : "border-transparent text-white/65 hover:border-white/8 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.9}
                  className={
                    active
                      ? "text-violet-200"
                      : "text-white/55 transition group-hover:text-white"
                  }
                />

                <span className="text-[15px] font-medium">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="relative px-5 pb-5 pt-7">
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/80">
                  Status da Plataforma
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-white/65">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                  Todos os sistemas operacionais
                </div>
              </div>

              <RefreshCcw
                size={17}
                className="text-violet-300"
              />
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[11px] text-white/40">
                Última sincronização
              </p>

              <p className="mt-1 text-sm font-medium text-white/85">
                Agora mesmo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/55 transition hover:bg-white/8 hover:text-white"
          >
            <LogOut size={19} />
            Sair da conta
          </button>
        </div>
      </div>
    </aside>
  );
}
