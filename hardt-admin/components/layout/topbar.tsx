"use client";

import { Bell, Search } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";

  return "Boa noite";
}

function getDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-24 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-8 backdrop-blur">
      <div>
        <p className="text-sm text-zinc-500">
          {getGreeting()},
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
          Isabella 👋
        </h1>

        <p className="mt-2 text-sm text-zinc-500 capitalize">
          {getDate()}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 lg:flex">
          <Search
            size={18}
            className="text-zinc-500"
          />

          <input
            placeholder="Pesquisar..."
            className="w-64 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        <button className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-violet-500/40 hover:bg-zinc-800">
          <Bell
            size={20}
            className="text-zinc-300"
          />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-violet-500" />
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white">
            I
          </div>

          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold text-white">
              Isabella Souza
            </p>

            <p className="text-xs text-zinc-500">
              Administradora
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}