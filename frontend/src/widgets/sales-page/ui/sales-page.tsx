"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import type { Lead } from "@/entities/lead/model/types";
import type { Meeting } from "@/entities/meeting/model/types";
import type { Sale } from "@/entities/sale/model/types";
import type { ServiceItem } from "@/entities/service/model/types";
import { useAuth } from "@/features/auth/model/auth-provider";
import { apiFetch } from "@/shared/api/http";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

const CALL_ORIGIN = "Ligação";

const initialSale = {
  id_lead: "",
  id_servico: "",
  id_reuniao: "",
  origem_fechamento: "WhatsApp",
  valor_venda: "",
  data_venda: "",
};

const saleOrigins = [
  { value: "Visita presencial", label: "Visita presencial" },
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: CALL_ORIGIN, label: "Ligação" },
];

function getLeadLabel(lead?: Lead) {
  if (!lead) return "-";
  return `${lead.nome_contato} • ${lead.nome_empresa}`;
}

function getMeetingStatusLabel(value: string) {
  if (value === "Não Compareceu") return "Não compareceu";
  return value;
}

function getMeetingLabel(meeting?: Meeting) {
  if (!meeting) return "Sem reunião";
  return `${new Date(meeting.data_reuniao).toLocaleString("pt-BR")} • ${getMeetingStatusLabel(meeting.status_reuniao)}`;
}

function getSaleOriginLabel(value: string) {
  return saleOrigins.find((origin) => origin.value === value)?.label ?? value;
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

export default function SalesPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === "ADMIN";

  const [items, setItems] = useState<Sale[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [saleForm, setSaleForm] = useState(initialSale);
  const [filters, setFilters] = useState({ origem_fechamento: "", id_servico: "", periodo_inicio: "", periodo_fim: "" });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id_lead, lead])), [leads]);
  const serviceMap = useMemo(() => new Map(services.map((service) => [service.id_servico, service])), [services]);
  const meetingMap = useMemo(() => new Map(meetings.map((meeting) => [meeting.id_reuniao, meeting])), [meetings]);

  const availableMeetings = useMemo(() => {
    if (!saleForm.id_lead) return meetings;
    return meetings.filter((meeting) => String(meeting.id_lead) === saleForm.id_lead);
  }, [meetings, saleForm.id_lead]);

  const salesHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canManage) headers.push("Ações");
    headers.push("ID", "Lead", "Serviço", "Reunião", "Origem", "Valor", "Data");
    return headers;
  }, [canManage]);

  async function loadSales(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await apiFetch<{ items: Sale[] }>(`/sales?${params.toString()}`);
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }

  async function loadDependencies() {
    const [servicesResponse, leadsResponse, meetingsResponse] = await Promise.all([
      apiFetch<{ items: ServiceItem[] }>("/services"),
      apiFetch<{ items: Lead[] }>("/leads"),
      apiFetch<{ items: Meeting[] }>("/meetings"),
    ]);
    setServices(servicesResponse.items);
    setLeads(leadsResponse.items);
    setMeetings(meetingsResponse.items);
  }

  async function loadAll(nextFilters = filters) {
    await Promise.all([loadSales(nextFilters), loadDependencies()]);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleCreateSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      await apiFetch<Sale>("/sales", {
        method: "POST",
        body: JSON.stringify({
          ...saleForm,
          id_lead: Number(saleForm.id_lead),
          id_servico: Number(saleForm.id_servico),
          id_reuniao: saleForm.id_reuniao ? Number(saleForm.id_reuniao) : null,
          valor_venda: Number(saleForm.valor_venda),
        }),
      });
      setFeedback("Venda registrada com sucesso.");
      setSaleForm(initialSale);
      void loadAll();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível registrar a venda."));
    }
  }

  async function handleDeleteSale(sale: Sale) {
    const confirmed = window.confirm("Excluir esta venda pode impactar o histórico comercial. Deseja continuar?");
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message: string }>(`/sales/${sale.id_venda}`, { method: "DELETE" });
      setFeedback(response.message ?? "Venda excluída com sucesso.");
      void loadSales();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir a venda."));
    }
  }

  const salesRows = items.map((sale) => {
    const row: ReactNode[] = [];
    if (canManage) {
      row.push(
        <div className="table-actions" key={`actions-sale-${sale.id_venda}`}>
          <button className="danger-button" type="button" onClick={() => void handleDeleteSale(sale)}>Excluir</button>
        </div>,
      );
    }
    row.push(
      sale.id_venda,
      getLeadLabel(leadMap.get(sale.id_lead)),
      serviceMap.get(sale.id_servico)?.nome_servico ?? "-",
      getMeetingLabel(sale.id_reuniao ? meetingMap.get(sale.id_reuniao) : undefined),
      getSaleOriginLabel(sale.origem_fechamento),
      formatCurrency(sale.valor_venda),
      sale.data_venda,
    );
    return row;
  });

  return (
    <>
      <PageHeader title="Vendas" badge="Fechamento" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>Nova venda</h3>
        </div>

        <form className="form-shell" onSubmit={handleCreateSale}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Vínculos</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Lead</span>
                <select value={saleForm.id_lead} onChange={(event) => setSaleForm({ ...saleForm, id_lead: event.target.value, id_reuniao: "" })} required>
                  <option value="">Selecione um lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id_lead} value={lead.id_lead}>{getLeadLabel(lead)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Serviço</span>
                <select value={saleForm.id_servico} onChange={(event) => setSaleForm({ ...saleForm, id_servico: event.target.value })} required>
                  <option value="">Selecione um serviço</option>
                  {services.map((service) => (
                    <option key={service.id_servico} value={service.id_servico}>{service.nome_servico}</option>
                  ))}
                </select>
              </label>
              <label className="field field-span-2">
                <span className="field-label">Reunião</span>
                <select value={saleForm.id_reuniao} onChange={(event) => setSaleForm({ ...saleForm, id_reuniao: event.target.value })}>
                  <option value="">Sem reunião</option>
                  {availableMeetings.map((meeting) => (
                    <option key={meeting.id_reuniao} value={meeting.id_reuniao}>{getMeetingLabel(meeting)}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Fechamento</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Origem</span>
                <select value={saleForm.origem_fechamento} onChange={(event) => setSaleForm({ ...saleForm, origem_fechamento: event.target.value })}>
                  {saleOrigins.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Valor</span>
                <input value={saleForm.valor_venda} onChange={(event) => setSaleForm({ ...saleForm, valor_venda: event.target.value })} placeholder="1500,00" required />
              </label>
              <label className="field">
                <span className="field-label">Data da venda</span>
                <input type="date" value={saleForm.data_venda} onChange={(event) => setSaleForm({ ...saleForm, data_venda: event.target.value })} required />
              </label>
            </div>
          </div>

          <div className="form-actions field-span-2">
            <button className="primary-button" type="submit">Registrar venda</button>
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
              <span className="field-label">Origem</span>
              <select value={filters.origem_fechamento} onChange={(event) => setFilters({ ...filters, origem_fechamento: event.target.value })}>
                <option value="">Todas</option>
                {saleOrigins.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Serviço</span>
              <select value={filters.id_servico} onChange={(event) => setFilters({ ...filters, id_servico: event.target.value })}>
                <option value="">Todos</option>
                {services.map((service) => (
                  <option key={service.id_servico} value={service.id_servico}>{service.nome_servico}</option>
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
          <button className="primary-button" type="button" onClick={() => void loadSales()}>Aplicar</button>
          <button className="secondary-button" type="button" onClick={() => { const cleared = { origem_fechamento: "", id_servico: "", periodo_inicio: "", periodo_fim: "" }; setFilters(cleared); void loadSales(cleared); }}>Limpar</button>
        </div>
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} venda(s)`} headers={salesHeaders} rows={salesRows} loading={loading} emptyMessage="Nenhuma venda encontrada." />
      </section>
    </>
  );
}
