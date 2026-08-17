"use client";

export type ArgosLogEntry = {
  id: string;
  time: string;
  message: string;
};

type ActivityLogProps = {
  entries: ArgosLogEntry[];
};

export function ActivityLog({
  entries,
}: ActivityLogProps) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
          Argos
        </div>

        <h2 className="mt-1 font-semibold text-white">
          Atividade
        </h2>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-zinc-600">
          Nenhuma atividade ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="relative border-l border-white/10 pl-4"
            >
              <div className="absolute -left-[3px] top-1.5 h-[5px] w-[5px] rounded-full bg-zinc-500" />

              <div className="text-[11px] font-medium text-zinc-600">
                {entry.time}
              </div>

              <div className="mt-1 text-sm leading-5 text-zinc-400">
                {entry.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
