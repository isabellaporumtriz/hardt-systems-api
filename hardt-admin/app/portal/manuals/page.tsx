"use client";

import {
  BookOpen,
  Download,
  FileText,
} from "lucide-react";

const manuals = [
  {
    id: "hardt-meet",
    product: "Hardt Meet",
    title: "Manual do Usuário",
    description:
      "Guia completo de instalação, liberação no macOS, ativação da licença e utilização do Hardt Meet.",
    version: "1.0",
    pages: 3,
    file: "/manuals/hardt-meet-manual.pdf",
  },
];

export default function ManualsPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-400">
          <BookOpen size={17} />
          Central de ajuda
        </div>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Manuais
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
          Consulte os guias de instalação e utilização dos
          produtos Hardt Systems.
        </p>
      </header>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {manuals.map((manual) => (
          <article
            key={manual.id}
            className="flex min-h-[330px] flex-col rounded-[24px] border border-white/[0.07] bg-[#111116] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/25 hover:bg-[#15151c]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                <FileText size={25} />
              </div>

              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                PDF
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                {manual.product}
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                {manual.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/45">
                {manual.description}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <p className="text-xs text-white/35">
                  Versão
                </p>

                <p className="mt-1 text-sm font-semibold text-white/80">
                  {manual.version}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <p className="text-xs text-white/35">
                  Páginas
                </p>

                <p className="mt-1 text-sm font-semibold text-white/80">
                  {manual.pages}
                </p>
              </div>
            </div>

            <a
              href={manual.file}
              download
              className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(124,58,237,0.22)] transition hover:bg-violet-500"
            >
              <Download size={17} />
              Baixar manual
            </a>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-[24px] border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.07] to-indigo-500/[0.03] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <BookOpen size={22} />
          </div>

          <div>
            <h2 className="font-bold text-white">
              Novos produtos, novos guias
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Conforme novos sistemas Hardt forem disponibilizados,
              os respectivos manuais aparecerão automaticamente
              nesta central.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
