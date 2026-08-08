import {
  BadgeCheck,
  KeyRound,
  Package,
  UserPlus,
} from "lucide-react";

const activities = [
  {
    icon: BadgeCheck,
    title: "Licença ativada",
    description: "João Silva ativou uma licença PRO.",
    time: "Agora",
  },
  {
    icon: UserPlus,
    title: "Novo usuário",
    description: "Maria Oliveira criou uma conta.",
    time: "12 min",
  },
  {
    icon: Package,
    title: "Produto atualizado",
    description: "Hardt Leads recebeu uma nova versão.",
    time: "38 min",
  },
  {
    icon: KeyRound,
    title: "Licença renovada",
    description: "Renovação concluída com sucesso.",
    time: "1 hora",
  },
];

export function ActivityFeed() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">

      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Atividade
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Atividade recente
        </h2>
      </div>

      <div className="space-y-5">

        {activities.map((activity) => (
          <div
            key={activity.title}
            className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-violet-500/30 hover:bg-zinc-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
              <activity.icon
                size={20}
                className="text-violet-400"
              />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {activity.title}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                {activity.description}
              </p>
            </div>

            <span className="text-xs text-zinc-600">
              {activity.time}
            </span>
          </div>
        ))}

      </div>
    </section>
  );
}