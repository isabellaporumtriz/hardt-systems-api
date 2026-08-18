import type {
  LucideIcon,
} from "lucide-react";


type FinanceKpiTone =
  | "violet"
  | "emerald"
  | "sky"
  | "rose";


type FinanceKpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: FinanceKpiTone;
};


const toneClasses: Record<
  FinanceKpiTone,
  {
    icon: string;
    glow: string;
    detail: string;
  }
> = {
  violet: {
    icon:
      "border-violet-500/20 bg-violet-500/10 text-violet-300",
    glow: "bg-violet-500/10",
    detail: "text-violet-300",
  },
  emerald: {
    icon:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    glow: "bg-emerald-500/10",
    detail: "text-emerald-300",
  },
  sky: {
    icon:
      "border-sky-500/20 bg-sky-500/10 text-sky-300",
    glow: "bg-sky-500/10",
    detail: "text-sky-300",
  },
  rose: {
    icon:
      "border-rose-500/20 bg-rose-500/10 text-rose-300",
    glow: "bg-rose-500/10",
    detail: "text-rose-300",
  },
};


export function FinanceKpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "violet",
}: FinanceKpiCardProps) {
  const classes = toneClasses[tone];

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-700">
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${classes.glow}`}
      />

      <div className="relative flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </p>

          <p className="mt-4 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-4 text-sm leading-6 text-zinc-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${classes.icon}`}
        >
          <Icon size={21} />
        </div>
      </div>

      <div
        className={`relative mt-6 h-px w-12 ${classes.detail} bg-current opacity-40`}
      />
    </article>
  );
}
