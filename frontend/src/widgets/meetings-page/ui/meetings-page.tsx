"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import type { Lead } from "@/entities/lead/model/types";
import type { Meeting } from "@/entities/meeting/model/types";
import { useAuth } from "@/features/auth/model/auth-provider";
import { apiFetch } from "@/shared/api/http";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

const initialForm = {
  id_lead: "",
  data_reuniao: "",
  status_reuniao: "Agendada",
};

const meetingStatuses = [
  { value: "Agendada", label: "Agendada" },
  { value: "Realizada", label: "Realizada" },
  { value: "NÃ£o Compareceu", label: "Não compareceu" },
  { value: "Remarcada", label: "Remarcada" },
];

function getLeadLabel(lead?: Lead) {
  if (!lead) return "-";
  return `${lead.nome_contato} • ${lead.nome_empresa}`;
}

function getMeetingStatusLabel(value: string) {
  return meetingStatuses.find((status) => status.value === value)?.label ?? value;
}

function toDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === "ADMIN";

  const [items, setItems] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ status_reuniao: "", periodo_inicio: "", periodo_fim: "" });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id_lead, lead])), [leads]);
  const tableHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canManage) headers.push("Ações");
    headers.push("ID", "Lead", "Data", "Status");
    return headers;
  }, [canManage]);

  async function loadItems(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await apiFetch<{ items: Meeting[] }>(`/meetings?${params.toString()}`);
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
    setEditingMeetingId(null);
  }

  function startEdit(meeting: Meeting) {
    setForm({
      id_lead: String(meeting.id_lead),
      data_reuniao: toDateTimeLocal(meeting.data_reuniao),
      status_reuniao: meeting.status_reuniao,
    });
    setEditingMeetingId(meeting.id_reuniao);
    setError("");
    setFeedback("Modo de edição ativo.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      if (editingMeetingId) {
        const response = await apiFetch<Meeting>(`/meetings/${editingMeetingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            data_reuniao: fromDateTimeLocal(form.data_reuniao),
            status_reuniao: form.status_reuniao,
          }),
        });
        setFeedback(response.notification ?? "Reunião atualizada com sucesso.");
      } else {
        const response = await apiFetch<Meeting>("/meetings", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            id_lead: Number(form.id_lead),
            data_reuniao: fromDateTimeLocal(form.data_reuniao),
          }),
        });
        setFeedback(response.notification ?? "Reunião registrada com sucesso.");
      }

      resetFormState();
      void loadItems();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, editingMeetingId ? "Não foi possível atualizar a reunião." : "Não foi possível registrar a reunião."));
    }
  }

  async function handleDelete(meeting: Meeting) {
    const confirmed = window.confirm("Excluir esta reunião pode impactar o histórico comercial. Deseja continuar?");
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message: string }>(`/meetings/${meeting.id_reuniao}`, { method: "DELETE" });
      setFeedback(response.message ?? "Reunião excluída com sucesso.");
      if (editingMeetingId === meeting.id_reuniao) resetFormState();
      void loadItems();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir a reunião."));
    }
  }

  const rows = items.map((meeting) => {
    const row: ReactNode[] = [];
    if (canManage) {
      row.push(
        <div className="table-actions" key={`actions-${meeting.id_reuniao}`}>
          <button className="ghost-button" type="button" onClick={() => startEdit(meeting)}>Editar</button>
          <button className="danger-button" type="button" onClick={() => void handleDelete(meeting)}>Excluir</button>
        </div>,
      );
    }

    row.push(meeting.id_reuniao, getLeadLabel(leadMap.get(meeting.id_lead)), new Date(meeting.data_reuniao).toLocaleString("pt-BR"), getMeetingStatusLabel(meeting.status_reuniao));
    return row;
  });

  return (
    <>
      <PageHeader title="Reuniões" badge="Agenda" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>{editingMeetingId ? "Editar reunião" : "Nova reunião"}</h3>
        </div>

        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Dados</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Lead</span>
                <select value={form.id_lead} onChange={(event) => setForm({ ...form, id_lead: event.target.value })} disabled={Boolean(editingMeetingId)} required>
                  <option value="">Selecione um lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id_lead} value={lead.id_lead}>{getLeadLabel(lead)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Data e hora</span>
                <input type="datetime-local" value={form.data_reuniao} onChange={(event) => setForm({ ...form, data_reuniao: event.target.value })} required />
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select value={form.status_reuniao} onChange={(event) => setForm({ ...form, status_reuniao: event.target.value })}>
                  {meetingStatuses.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="form-actions field-span-2">
            <button className="primary-button" type="submit">{editingMeetingId ? "Salvar" : "Registrar reunião"}</button>
            <button className="secondary-button" type="button" onClick={() => { resetFormState(); setError(""); setFeedback(""); }}>
              {editingMeetingId ? "Cancelar" : "Limpar"}
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
              <span className="field-label">Status</span>
              <select value={filters.status_reuniao} onChange={(event) => setFilters({ ...filters, status_reuniao: event.target.value })}>
                <option value="">Todos</option>
                {meetingStatuses.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Período inicial</span>
              <input type="date" value={filters.periodo_inicio} onChange={(event) => setFilters({ ...filters, periodo_inicio: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Período final</span>
              <input type="date" value={filters.periodo_fim} onChange={(event) => setFilters({ ...filters, periodo_fim: event.target.value })} />
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => void loadItems()}>Aplicar</button>
          <button className="secondary-button" type="button" onClick={() => { const cleared = { status_reuniao: "", periodo_inicio: "", periodo_fim: "" }; setFilters(cleared); void loadItems(cleared); }}>Limpar</button>
        </div>
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} reunião(ões)`} headers={tableHeaders} rows={rows} loading={loading} emptyMessage="Nenhuma reunião encontrada." />
      </section>
    </>
  );
}
