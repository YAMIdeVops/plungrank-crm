"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import type { Attempt } from "@/entities/attempt/model/types";
import type { Lead } from "@/entities/lead/model/types";
import { useAuth } from "@/features/auth/model/auth-provider";
import { useNotifications } from "@/features/notifications/model/notification-provider";
import { apiFetch } from "@/shared/api/http";
import { extractIsoDate, formatDateDisplay } from "@/shared/lib/date-display";
import { getLeadStatusTone } from "@/shared/lib/lead-status";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import { DataTable } from "@/shared/ui/data-table";
import { LeadSearchSelect } from "@/shared/ui/lead-search-select";
import { PageHeader } from "@/shared/ui/page-header";

const STATUS_MEETING = "Reunião Marcada";

const initialForm = {
  id_lead: "",
  data_tentativa: "",
  modalidade: "Online",
  canal: "WhatsApp",
  status: "Tentando Contato",
};

const modalityOptions = [
  { value: "Presencial", label: "Presencial" },
  { value: "Online", label: "Online" },
];

const channelOptions = [
  { value: "Visita presencial", label: "Visita presencial" },
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Ligação", label: "Ligação" },
];

const attemptStatusOptions = [
  { value: "Tentando Contato", label: "Tentando contato" },
  { value: "Em Contato", label: "Em contato" },
  { value: STATUS_MEETING, label: "Reunião marcada" },
  { value: "Proposta Enviada", label: "Proposta enviada" },
  { value: "Proposta Recusada", label: "Proposta recusada" },
  { value: "Não tem interesse", label: "Não tem interesse" },
  { value: "Venda realizada", label: "Venda realizada" },
];

function canonicalTextKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ÃƒÃ‚]/g, "")
    .toLowerCase()
    .trim();
}

function getLeadLabel(lead?: Lead) {
  if (!lead) return "-";
  return `${lead.nome_contato} - ${lead.nome_empresa}`;
}

function getLeadOptionLabel(lead?: Lead) {
  if (!lead) return "-";
  return getLeadLabel(lead);
}

function renderLeadLabel(lead?: Lead) {
  if (!lead) return "-";
  return (
    <span className="lead-status-label">
      <span>{getLeadLabel(lead)}</span>
      <span className={`lead-status-dot ${getLeadStatusTone(lead.situacao)}`} />
    </span>
  );
}

function getOptionLabel(options: Array<{ value: string; label: string }>, value: string) {
  const directMatch = options.find((option) => option.value === value);
  if (directMatch) return directMatch.label;
  const fallbackMatch = options.find((option) => canonicalTextKey(option.value) === canonicalTextKey(value));
  return fallbackMatch?.label ?? value;
}

export default function AttemptsPage() {
  const { user } = useAuth();
  const { pushMeetingNotification } = useNotifications();
  const canManage = user?.perfil === "ADMIN";

  const [items, setItems] = useState<Attempt[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingAttemptId, setEditingAttemptId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ modalidade: "", canal: "", status: "" });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id_lead, lead])), [leads]);
  const tableHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canManage) headers.push("Ações");
    headers.push("ID", "Lead", "Data", "Modalidade", "Canal", "Status");
    return headers;
  }, [canManage]);

  async function loadItems(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await apiFetch<{ items: Attempt[] }>(`/attempts?${params.toString()}`);
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeads() {
    const response = await apiFetch<{ items: Lead[] }>("/leads");
    setLeads(response.items);
  }

  useEffect(() => {
    void Promise.all([loadItems(), loadLeads()]);
  }, []);

  function resetFormState() {
    setForm(initialForm);
    setEditingAttemptId(null);
  }

  function startEdit(attempt: Attempt) {
    setForm({
      id_lead: String(attempt.id_lead),
      data_tentativa: extractIsoDate(attempt.data_tentativa),
      modalidade: attempt.modalidade,
      canal: attempt.canal,
      status: attempt.status,
    });
    setEditingAttemptId(attempt.id_tentativa);
    setError("");
    setFeedback("Modo de edição ativo.");
  }

  function maybeNotifyMeeting(response: Attempt) {
    if (response.notification && canonicalTextKey(form.status) === canonicalTextKey(STATUS_MEETING)) {
      pushMeetingNotification(response.notification);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      if (editingAttemptId) {
        const response = await apiFetch<Attempt>(`/attempts/${editingAttemptId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: form.status }),
        });
        maybeNotifyMeeting(response);
        setFeedback(response.notification ?? "Tentativa atualizada com sucesso.");
      } else {
        const response = await apiFetch<Attempt>("/attempts", {
          method: "POST",
          body: JSON.stringify({ ...form, id_lead: Number(form.id_lead) }),
        });
        maybeNotifyMeeting(response);
        setFeedback(response.notification ?? "Tentativa registrada com sucesso.");
      }

      resetFormState();
      void loadItems();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, editingAttemptId ? "Não foi possível atualizar a tentativa." : "Não foi possível registrar a tentativa."));
    }
  }

  async function handleDelete(attempt: Attempt) {
    const confirmed = window.confirm("Excluir esta tentativa pode alterar a situação do lead e impactar o histórico. Deseja continuar?");
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message: string }>(`/attempts/${attempt.id_tentativa}`, { method: "DELETE" });
      setFeedback(response.message ?? "Tentativa excluída com sucesso.");
      if (editingAttemptId === attempt.id_tentativa) resetFormState();
      void loadItems();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir a tentativa."));
    }
  }

  const rows = items.map((attempt) => {
    const row: ReactNode[] = [];
    if (canManage) {
      row.push(
        <div className="table-actions" key={`actions-${attempt.id_tentativa}`}>
          <button className="ghost-button" type="button" onClick={() => startEdit(attempt)}>Editar</button>
          <button className="danger-button" type="button" onClick={() => void handleDelete(attempt)}>Excluir</button>
        </div>,
      );
    }

    row.push(
      attempt.id_tentativa,
      renderLeadLabel(leadMap.get(attempt.id_lead)),
      formatDateDisplay(attempt.data_tentativa),
      getOptionLabel(modalityOptions, attempt.modalidade),
      getOptionLabel(channelOptions, attempt.canal),
      getOptionLabel(attemptStatusOptions, attempt.status),
    );

    return row;
  });

  return (
    <>
      <PageHeader title="Tentativas" badge="Contato" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>{editingAttemptId ? "Editar tentativa" : "Nova tentativa"}</h3>
        </div>

        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Dados</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Lead</span>
                <LeadSearchSelect
                  leads={leads}
                  value={form.id_lead}
                  onChange={(value) => setForm({ ...form, id_lead: value })}
                  disabled={Boolean(editingAttemptId)}
                  required
                  searchPlaceholder="Pesquisar lead pelo nome"
                  formatLeadLabel={getLeadOptionLabel}
                />
              </label>
              <label className="field">
                <span className="field-label">Data</span>
                <input type="date" value={form.data_tentativa} onChange={(event) => setForm({ ...form, data_tentativa: event.target.value })} disabled={Boolean(editingAttemptId)} required />
              </label>
              <label className="field">
                <span className="field-label">Modalidade</span>
                <select value={form.modalidade} onChange={(event) => setForm({ ...form, modalidade: event.target.value })} disabled={Boolean(editingAttemptId)}>
                  {modalityOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Canal</span>
                <select value={form.canal} onChange={(event) => setForm({ ...form, canal: event.target.value })} disabled={Boolean(editingAttemptId)}>
                  {channelOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field field-span-2">
                <span className="field-label">Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {attemptStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="form-actions field-span-2">
            <button className="primary-button" type="submit">{editingAttemptId ? "Salvar" : "Registrar tentativa"}</button>
            <button className="secondary-button" type="button" onClick={() => { resetFormState(); setError(""); setFeedback(""); }}>
              {editingAttemptId ? "Cancelar" : "Limpar"}
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
              <span className="field-label">Modalidade</span>
              <select value={filters.modalidade} onChange={(event) => setFilters({ ...filters, modalidade: event.target.value })}>
                <option value="">Todas</option>
                {modalityOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Canal</span>
              <select value={filters.canal} onChange={(event) => setFilters({ ...filters, canal: event.target.value })}>
                <option value="">Todos</option>
                {channelOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">Todos</option>
                {attemptStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => void loadItems()}>Aplicar</button>
          <button className="secondary-button" type="button" onClick={() => { const cleared = { modalidade: "", canal: "", status: "" }; setFilters(cleared); void loadItems(cleared); }}>Limpar</button>
        </div>
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} tentativa(s)`} headers={tableHeaders} rows={rows} loading={loading} emptyMessage="Nenhuma tentativa encontrada." />
      </section>
    </>
  );
}
