


"use client";

import {
  ChevronRight,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";


const items = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: KeyRound,
    title: "Licenças",
    href: "/licenses",
    badge: "1",
  },
  {
    icon: Package,
    title: "Produtos",
    href: "/products",
  },
  {
    icon: Users,
    title: "Usuários",
    href: "/users",
  },
  {
    icon: CreditCard,
    title: "Financeiro",
    href: "/finance",
  },
  {
    icon: Monitor,
    title: "Dispositivos",
    href: "/devices",
  },
  {
    icon: Settings,
    title: "Configurações",
    href: "/settings",
  },
];


function isRouteActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return (
    pathname === href
    || pathname.startsWith(`${href}/`)
  );
}


export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 p-8">
        <Link
          href="/dashboard"
          className="inline-block"
        >
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Hardt
            <span className="text-violet-500">
              {" "}
              Console
            </span>
          </h1>
        </Link>

        <p className="mt-2 text-sm text-zinc-500">
          Painel Administrativo
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {items.map((item) => {
          const active = isRouteActive(
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
              className={`group mb-2 flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200 ${
                active
                  ? "border-violet-500/30 bg-violet-500/10 text-white"
                  : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={20}
                  className={
                    active
                      ? "text-violet-400"
                      : "text-zinc-500 transition group-hover:text-white"
                  }
                />

                <span className="font-medium">
                  {item.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">
                    {item.badge}
                  </span>
                )}

                <ChevronRight
                  size={16}
                  className={
                    active
                      ? "text-violet-400"
                      : "text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300"
                  }
                />
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Hardt Systems
          </p>

          <p className="mt-2 text-lg font-semibold text-white">
            v1.0.0
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Console Administrativo
          </p>
        </div>
      </div>
    </aside>
  );
}