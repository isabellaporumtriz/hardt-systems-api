"use client";

import {
  CalendarDays,
  Layers3,
} from "lucide-react";

import type {
  FinanceBusinessUnit,
  FinanceGranularity,
} from "@/lib/api/finance-v2";


export type FinanceUnitFilter =
  | FinanceBusinessUnit
  | "all";


type FinanceFiltersProps = {
  businessUnit: FinanceUnitFilter;
  granularity: FinanceGranularity;
  startDate: string;
  endDate: string;

  onBusinessUnitChange: (
    value: FinanceUnitFilter,
  ) => void;

  onGranularityChange: (
    value: FinanceGranularity,
  ) => void;

  onStartDateChange: (
    value: string,
  ) => void;

  onEndDateChange: (
    value: string,
  ) => void;
};


const selectClasses =
  "h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none transition focus:border-violet-500/50";


export function FinanceFilters({
  businessUnit,
  granularity,
  startDate,
  endDate,
  onBusinessUnitChange,
  onGranularityChange,
  onStartDateChange,
  onEndDateChange,
}: FinanceFiltersProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
            <Layers3 size={18} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Visão financeira
            </p>

            <p className="text-xs text-zinc-500">
              Filtre unidade, período e granularidade
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Unidade de negócio"
            value={businessUnit}
            onChange={(event) =>
              onBusinessUnitChange(
                event.target.value as FinanceUnitFilter,
              )
            }
            className={selectClasses}
          >
            <option value="all">
              Todas as unidades
            </option>

            <option value="hardt_api">
              hardt.api
            </option>

            <option value="hardt_studio">
              hardt.studio
            </option>

            <option value="hardt_systems">
              hardt.systems
            </option>

            <option value="corporate">
              Corporativo
            </option>
          </select>

          <select
            aria-label="Granularidade"
            value={granularity}
            onChange={(event) =>
              onGranularityChange(
                event.target.value as FinanceGranularity,
              )
            }
            className={selectClasses}
          >
            <option value="day">
              Diário
            </option>

            <option value="month">
              Mensal
            </option>
          </select>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-500">
            <CalendarDays size={16} />

            <input
              type="date"
              aria-label="Data inicial"
              value={startDate}
              onChange={(event) =>
                onStartDateChange(
                  event.target.value,
                )
              }
              className="bg-transparent text-sm text-zinc-200 outline-none [color-scheme:dark]"
            />
          </label>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-500">
            <CalendarDays size={16} />

            <input
              type="date"
              aria-label="Data final"
              value={endDate}
              onChange={(event) =>
                onEndDateChange(
                  event.target.value,
                )
              }
              className="bg-transparent text-sm text-zinc-200 outline-none [color-scheme:dark]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
