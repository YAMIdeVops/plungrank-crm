"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import type { Lead } from "@/entities/lead/model/types";
import { useAuth } from "@/features/auth/model/auth-provider";
import { apiFetch } from "@/shared/api/http";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

const LEAD_STATUS_NEW = "Novo";
const LEAD_STATUS_PROSPECTION = "Em prospecÃ§Ã£o";
const LEAD_STATUS_CLIENT = "Cliente";
const LEAD_STATUS_INACTIVE = "Inativo";
const SITE_NO = "NÃƒO";

const initialForm = {
  nome_contato: "",
  nome_empresa: "",
  telefone: "",
  instagram: "",
  nicho: "",
  fonte_lead: "Google Maps",
  situacao: LEAD_STATUS_NEW,
  estado: "",
  tem_site: "SIM",
  data_cadastro: "",
};

const initialFilters = {
  telefone: "",
  nome_contato: "",
  nome_empresa: "",
  nicho: "",
  fonte_lead: "",
  situacao: "",
  tem_site: "",
};

const leadSources = ["Google Maps", "Instagram", "Casa dos Dados", "Receita Federal"];

const leadSituationOptions = [
  { value: LEAD_STATUS_NEW, label: "Novo" },
  { value: LEAD_STATUS_PROSPECTION, label: "Em prospecção" },
  { value: LEAD_STATUS_CLIENT, label: "Cliente" },
  { value: LEAD_STATUS_INACTIVE, label: "Inativo" },
];

const siteOptions = [
  { value: "SIM", label: "Sim" },
  { value: SITE_NO, label: "Não" },
];

function normalizeDateInput(value: string) {
  if (!value) return "";

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) return directMatch[0];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLeadSituationLabel(value: string) {
  return leadSituationOptions.find((option) => option.value === value)?.label ?? value;
}

function getSiteLabel(value: string) {
  return siteOptions.find((option) => option.value === value)?.label ?? value;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === "ADMIN";

  const [items, setItems] = useState<Lead[]>([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tableHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canManage) headers.push("Ações");
    headers.push("ID", "Contato", "Empresa", "Telefone", "Situação", "Origem", "Nicho", "Site");
    return headers;
  }, [canManage]);

  async function loadItems(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await apiFetch<{ items: Lead[] }>(`/leads?${params.toString()}`);
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function resetFormState() {
    setForm(initialForm);
    setEditingLeadId(null);
  }

  function startEdit(lead: Lead) {
    setForm({
      nome_contato: lead.nome_contato,
      nome_empresa: lead.nome_empresa,
      telefone: lead.telefone,
      instagram: lead.instagram === "--" ? "" : lead.instagram,
      nicho: lead.nicho,
      fonte_lead: lead.fonte_lead,
      situacao: lead.situacao,
      estado: lead.estado,
      tem_site: lead.tem_site,
      data_cadastro: normalizeDateInput(lead.data_cadastro),
    });
    setEditingLeadId(lead.id_lead);
    setError("");
    setFeedback("Modo de edição ativo.");
  }

  function validateLeadSituationBeforeSubmit() {
    if (!editingLeadId && form.situacao === LEAD_STATUS_PROSPECTION) {
      return "Este lead não pode ser cadastrado como Em prospecção porque ainda não existe tentativa de contato vinculada a ele.";
    }
    if (!editingLeadId && form.situacao === LEAD_STATUS_CLIENT) {
      return "Este lead não pode ser cadastrado como Cliente porque ainda não existe venda vinculada a ele.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    const validationMessage = validateLeadSituationBeforeSubmit();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      if (editingLeadId) {
        const { data_cadastro: _ignoredDate, ...updatePayload } = form;
        await apiFetch<Lead>(`/leads/${editingLeadId}`, {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        });
        setFeedback("Lead atualizado com sucesso.");
      } else {
        const response = await apiFetch<Lead & { alerta_instagram?: string }>("/leads", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setFeedback(response.alerta_instagram ?? "Lead cadastrado com sucesso.");
      }

      resetFormState();
      void loadItems();
    } catch (err) {
      setError(
        getFriendlyErrorMessage(
          err,
          editingLeadId ? "Não foi possível atualizar o lead." : "Não foi possível cadastrar o lead.",
        ),
      );
    }
  }

  async function handleDelete(lead: Lead) {
    const confirmed = window.confirm(
      `Excluir o lead "${lead.nome_contato}" também apagará tentativas, reuniões e vendas vinculadas. Deseja continuar?`,
    );
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message: string }>(
        `/leads/${lead.id_lead}?confirmar_exclusao=true`,
        { method: "DELETE" },
      );
      setFeedback(response.message ?? "Lead excluído com sucesso.");
      if (editingLeadId === lead.id_lead) resetFormState();
      void loadItems();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir o lead."));
    }
  }

  function clearFilters() {
    setFilters(initialFilters);
    void loadItems(initialFilters);
  }

  const rows = items.map((lead) => {
    const row: ReactNode[] = [];
    if (canManage) {
      row.push(
        <div className="table-actions" key={`actions-${lead.id_lead}`}>
          <button className="ghost-button" type="button" onClick={() => startEdit(lead)}>
            Editar
          </button>
          <button className="danger-button" type="button" onClick={() => void handleDelete(lead)}>
            Excluir
          </button>
        </div>,
      );
    }

    row.push(
      lead.id_lead,
      lead.nome_contato,
      lead.nome_empresa,
      lead.telefone,
      getLeadSituationLabel(lead.situacao),
      lead.fonte_lead,
      lead.nicho,
      getSiteLabel(lead.tem_site),
    );

    return row;
  });

  return (
    <>
      <PageHeader title="Leads" badge="Base comercial" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>{editingLeadId ? "Editar lead" : "Novo lead"}</h3>
        </div>

        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Contato</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Nome do contato</span>
                <input value={form.nome_contato} onChange={(event) => setForm({ ...form, nome_contato: event.target.value })} placeholder="Maria Oliveira" required />
              </label>
              <label className="field">
                <span className="field-label">Empresa</span>
                <input value={form.nome_empresa} onChange={(event) => setForm({ ...form, nome_empresa: event.target.value })} placeholder="Clínica Horizonte" required />
              </label>
              <label className="field">
                <span className="field-label">Telefone</span>
                <input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} placeholder="(85) 99999-9999" inputMode="numeric" required />
              </label>
              <label className="field">
                <span className="field-label">Instagram</span>
                <input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} placeholder="@empresa" />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Qualificação</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Nicho</span>
                <input value={form.nicho} onChange={(event) => setForm({ ...form, nicho: event.target.value })} placeholder="Estética, Odonto, Restaurante" required />
              </label>
              <label className="field">
                <span className="field-label">Fonte</span>
                <select value={form.fonte_lead} onChange={(event) => setForm({ ...form, fonte_lead: event.target.value })}>
                  {leadSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Situação</span>
                <select value={form.situacao} onChange={(event) => setForm({ ...form, situacao: event.target.value })}>
                  {leadSituationOptions.map((situation) => (
                    <option key={situation.value} value={situation.value}>{situation.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Tem site</span>
                <select value={form.tem_site} onChange={(event) => setForm({ ...form, tem_site: event.target.value })}>
                  {siteOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Estado</span>
                <input value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value.toUpperCase() })} placeholder="UF" maxLength={2} required />
              </label>
              <label className="field">
                <span className="field-label">Data de cadastro</span>
                <input
                  type="date"
                  value={form.data_cadastro}
                  onChange={(event) => setForm({ ...form, data_cadastro: event.target.value })}
                  required={!editingLeadId}
                  disabled={Boolean(editingLeadId)}
                />
              </label>
            </div>
          </div>

          <div className="form-actions field-span-2">
            <button className="primary-button" type="submit">{editingLeadId ? "Salvar alterações" : "Salvar lead"}</button>
            <button className="secondary-button" type="button" onClick={() => { resetFormState(); setError(""); setFeedback(""); }}>
              {editingLeadId ? "Cancelar" : "Limpar"}
            </button>
          </div>
        </form>

        {error ? <div className="feedback error">{error}</div> : null}
        {feedback ? <div className="feedback">{feedback}</div> : null}
      </section>

      <section className="panel panel-filter stack-lg">
        <div className="panel-header">
          <h3>Filtrar</h3>
        </div>

        <div className="form-section">
          <div className="form-section-grid">
            <label className="field">
              <span className="field-label">Telefone</span>
              <input value={filters.telefone} onChange={(event) => setFilters({ ...filters, telefone: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Contato</span>
              <input value={filters.nome_contato} onChange={(event) => setFilters({ ...filters, nome_contato: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Empresa</span>
              <input value={filters.nome_empresa} onChange={(event) => setFilters({ ...filters, nome_empresa: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Nicho</span>
              <input value={filters.nicho} onChange={(event) => setFilters({ ...filters, nicho: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Fonte</span>
              <select value={filters.fonte_lead} onChange={(event) => setFilters({ ...filters, fonte_lead: event.target.value })}>
                <option value="">Todas</option>
                {leadSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Situação</span>
              <select value={filters.situacao} onChange={(event) => setFilters({ ...filters, situacao: event.target.value })}>
                <option value="">Todas</option>
                {leadSituationOptions.map((situation) => (
                  <option key={situation.value} value={situation.value}>{situation.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Tem site</span>
              <select value={filters.tem_site} onChange={(event) => setFilters({ ...filters, tem_site: event.target.value })}>
                <option value="">Todos</option>
                {siteOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => void loadItems()}>Aplicar</button>
          <button className="secondary-button" type="button" onClick={clearFilters}>Limpar</button>
        </div>
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} lead(s)`} headers={tableHeaders} rows={rows} loading={loading} emptyMessage="Nenhum lead encontrado." />
      </section>
    </>
  );
}
