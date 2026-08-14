"use client";

import {
  BookOpen,
  Download,
  Gauge,
  KeyRound,
  LogOut,
  Monitor,
  RefreshCcw,
  ShoppingBag,
  ReceiptText,
  UserRound,
  WalletCards,
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
    title: "Manuais",
    href: "/portal/manuals",
    icon: BookOpen,
  },
  {
    title: "Dispositivos",
    href: "/portal/devices",
    icon: Monitor,
  },
  {
    title: "Carteira",
    href: "/portal/wallet",
    icon: WalletCards,
  },
  {
    title: "Loja",
    href: "/portal/store",
    icon: ShoppingBag,
  },
  {
    title: "Minhas Compras",
    href: "/portal/purchases",
    icon: ReceiptText,
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] overflow-hidden border-r border-white/[0.06] bg-[#0b0712] lg:block">
      <div className="absolute -bottom-24 left-[-120px] h-72 w-[460px] rotate-[-10deg] rounded-[100%] border border-violet-400/10 bg-violet-500/[0.06] blur-2xl" />

      <div className="relative flex h-full flex-col">
        <div className="px-7 pb-8 pt-8">
          <PortalLogo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-5">
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
                className={`group flex items-center gap-4 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                  active
                    ? "border-violet-400/20 bg-violet-500/15 text-white shadow-[0_16px_40px_rgba(76,29,149,0.18)]"
                    : "border-transparent text-white/55 hover:border-white/[0.07] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.9}
                  className={
                    active
                      ? "text-violet-300"
                      : "text-white/40 transition group-hover:text-white"
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
          <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/75">
                  Status da Plataforma
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                  Todos os sistemas operacionais
                </div>
              </div>

              <RefreshCcw
                size={17}
                className="text-violet-300"
              />
            </div>

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-[11px] text-white/30">
                Última sincronização
              </p>

              <p className="mt-1 text-sm font-medium text-white/75">
                Agora mesmo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/45 transition hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut size={19} />
            Sair da conta
          </button>
        </div>
      </div>
    </aside>
  );
}
