type LicenseStatusProps = {
  active: number;
  pending: number;
  suspended: number;
  revoked: number;
  expired: number;
  total: number;
};

export function LicenseStatus({
  active,
  pending,
  suspended,
  revoked,
  expired,
  total,
}: LicenseStatusProps) {
  const calculatePercentage = (value: number) => {
    if (total === 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  };

  const statuses = [
    {
      label: "Ativas",
      value: active,
      percentage: calculatePercentage(active),
    },
    {
      label: "Pendentes",
      value: pending,
      percentage: calculatePercentage(pending),
    },
    {
      label: "Suspensas",
      value: suspended,
      percentage: calculatePercentage(suspended),
    },
    {
      label: "Revogadas",
      value: revoked,
      percentage: calculatePercentage(revoked),
    },
    {
      label: "Expiradas",
      value: expired,
      percentage: calculatePercentage(expired),
    },
  ];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Status das licenças
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Distribuição atual das licenças.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {statuses.map((status) => (
          <div key={status.label}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                {status.label}
              </span>

              <span className="text-sm font-medium text-white">
                {status.value}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-700"
                style={{
                  width: `${status.percentage}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm text-zinc-500">
          Taxa de licenças ativas
        </p>

        <p className="mt-2 text-2xl font-semibold text-white">
          {calculatePercentage(active)}%
        </p>
      </div>
    </section>
  );
}
