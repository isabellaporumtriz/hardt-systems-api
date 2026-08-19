"use client";

import {
  type ChangeEvent,
} from "react";

import {
  type ArgosCnpjIntake,
  type ArgosCompanyData,
} from "@/lib/api/client-argos";


type CompanyField =
  keyof ArgosCompanyData;


type CnpjIntakeCardProps = {
  intake: ArgosCnpjIntake | null;

  companyData:
    | ArgosCompanyData
    | null;

  uploading: boolean;
  confirming: boolean;

  onFileSelected: (
    file: File,
  ) => void;

  onCompanyDataChange: (
    field: CompanyField,
    value: string,
  ) => void;

  onConfirm: () => void;
};


type FieldProps = {
  label: string;

  field: CompanyField;

  value: string;

  onChange: (
    field: CompanyField,
    value: string,
  ) => void;

  wide?: boolean;
};


function CompanyFieldInput({
  label,
  field,
  value,
  onChange,
  wide = false,
}: FieldProps) {
  return (
    <label
      className={
        wide
          ? "md:col-span-2"
          : undefined
      }
    >
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => {
          onChange(
            field,
            event.target.value,
          );
        }}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-violet-500/40"
      />
    </label>
  );
}


export function CnpjIntakeCard({
  intake,
  companyData,
  uploading,
  confirming,
  onFileSelected,
  onCompanyDataChange,
  onConfirm,
}: CnpjIntakeCardProps) {

  function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    onFileSelected(file);

    event.target.value = "";
  }


  if (!intake || !companyData) {
    return (
      <section className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] p-6">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            Nova empresa
          </div>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Comece pelo Cartão CNPJ
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            O Argos lê os dados oficiais da
            Receita Federal antes de criar a
            operação. Nenhum domínio é
            comprado nesta etapa.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6">
          <div className="text-sm font-semibold text-zinc-200">
            Cartão CNPJ da Receita Federal
          </div>

          <div className="mt-1 text-xs text-zinc-600">
            Formato PDF · máximo 10 MB
          </div>

          <label
            className={
              "mt-5 inline-flex cursor-pointer "
              + "items-center rounded-xl "
              + "bg-white px-5 py-3 text-sm "
              + "font-semibold text-black transition "
              + "hover:bg-zinc-200 "
              + (
                uploading
                  ? "pointer-events-none opacity-50"
                  : ""
              )
            }
          >
            {
              uploading
                ? "Processando PDF..."
                : "Selecionar Cartão CNPJ"
            }

            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={uploading}
              onChange={handleFile}
              className="hidden"
            />
          </label>

          <div className="mt-4 text-xs text-zinc-600">
            A operação só será criada depois
            que você revisar e confirmar os
            dados extraídos.
          </div>
        </div>
      </section>
    );
  }


  const canConfirm =
    companyData.cnpj.trim().length > 0
    && companyData.razao_social.trim().length >= 2
    && companyData.nome_fantasia.trim().length >= 2;


  return (
    <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Cartão CNPJ processado
          </div>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Confira os dados da empresa
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Corrija qualquer campo necessário.
            O nome fantasia confirmado será
            usado como nome da operação e
            como base dos candidatos de domínio.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">
            Documento
          </div>

          <div className="mt-1 max-w-[300px] truncate text-xs text-zinc-400">
            {intake.original_filename}
          </div>
        </div>
      </div>


      <div className="mt-6 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] px-4 py-3 text-sm text-violet-200">
        Nome da operação após confirmar:{" "}
        <strong>
          {
            companyData.nome_fantasia
            || "preencha o nome fantasia"
          }
        </strong>
      </div>


      <div className="mt-6 grid gap-4 md:grid-cols-2">

        <CompanyFieldInput
          label="CNPJ"
          field="cnpj"
          value={companyData.cnpj}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Situação cadastral"
          field="situacao_cadastral"
          value={
            companyData.situacao_cadastral
          }
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Razão social"
          field="razao_social"
          value={companyData.razao_social}
          onChange={onCompanyDataChange}
          wide
        />

        <CompanyFieldInput
          label="Nome fantasia"
          field="nome_fantasia"
          value={companyData.nome_fantasia}
          onChange={onCompanyDataChange}
          wide
        />

        <CompanyFieldInput
          label="Data de abertura"
          field="data_abertura"
          value={companyData.data_abertura}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="CNAE principal"
          field="cnae_principal"
          value={companyData.cnae_principal}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Atividade principal"
          field="atividade_principal"
          value={companyData.atividade_principal}
          onChange={onCompanyDataChange}
          wide
        />

        <CompanyFieldInput
          label="Natureza jurídica"
          field="natureza_juridica"
          value={companyData.natureza_juridica}
          onChange={onCompanyDataChange}
          wide
        />

        <CompanyFieldInput
          label="Logradouro"
          field="logradouro"
          value={companyData.logradouro}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Número"
          field="numero"
          value={companyData.numero}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Complemento"
          field="complemento"
          value={companyData.complemento}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Bairro"
          field="bairro"
          value={companyData.bairro}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Cidade"
          field="cidade"
          value={companyData.cidade}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="UF"
          field="estado"
          value={companyData.estado}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="CEP"
          field="cep"
          value={companyData.cep}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="Telefone"
          field="telefone"
          value={companyData.telefone}
          onChange={onCompanyDataChange}
        />

        <CompanyFieldInput
          label="E-mail"
          field="email"
          value={companyData.email}
          onChange={onCompanyDataChange}
          wide
        />
      </div>


      <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">

        <div className="text-xs leading-5 text-zinc-600">
          Confirmar cria a operação.
          Comprar domínio continuará sendo
          uma ação separada e explícita.
        </div>

        <button
          type="button"
          disabled={
            !canConfirm
            || confirming
          }
          onClick={onConfirm}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {
            confirming
              ? "Criando operação..."
              : "Confirmar empresa e continuar"
          }
        </button>
      </div>
    </section>
  );
}
