import type {
  FinanceBusinessUnit,
} from "@/lib/api/finance-v2";


export function toFiniteNumber(
  value: string | number | null | undefined,
): number {
  const numericValue = Number(value ?? 0);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}


export function formatCurrency(
  value: string | number | null | undefined,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(
    toFiniteNumber(value),
  );
}


export function formatPercent(
  value: string | number | null | undefined,
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    },
  ).format(
    toFiniteNumber(value),
  ) + "%";
}


export function getBusinessUnitLabel(
  unit: FinanceBusinessUnit,
): string {
  const labels: Record<
    FinanceBusinessUnit,
    string
  > = {
    hardt_api: "hardt.api",
    hardt_studio: "hardt.studio",
    hardt_systems: "hardt.systems",
    corporate: "Corporativo",
  };

  return labels[unit];
}


export function formatPeriodLabel(
  value: string,
  granularity: "day" | "month",
): string {
  const date = new Date(
    `${value}T12:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (granularity === "month") {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        month: "short",
        year: "2-digit",
      },
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(date);
}
