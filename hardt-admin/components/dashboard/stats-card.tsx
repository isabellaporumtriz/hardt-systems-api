import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, TrendingUp } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10">

      {/* Glow */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition-all duration-500 group-hover:opacity-100" />

      {/* Linha Superior */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            {title}
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">
            {value}
          </h2>

          <div className="mt-6 flex items-center gap-2">

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15">
              <TrendingUp
                size={14}
                className="text-violet-400"
              />
            </div>

            <span className="text-sm font-medium text-zinc-400">
              {description}
            </span>

          </div>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 transition-all duration-300 group-hover:border-violet-500/40 group-hover:bg-violet-500/10">

          <Icon
            size={24}
            className="text-violet-400"
          />

        </div>

      </div>

      <div className="mt-8 flex items-center gap-2 text-sm text-violet-400">

        <ArrowUpRight size={16} />

        <span>
          Ver detalhes
        </span>

      </div>

    </div>
  );
}