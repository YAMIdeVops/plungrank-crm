"use client";

import { useEffect, useMemo, useState } from "react";

import { MetricCard } from "@/shared/ui/metric-card";
import { PageHeader } from "@/shared/ui/page-header";
import { apiFetch } from "@/shared/api/http";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";

type DashboardMetrics = {
  total_leads: number;
  total_leads_prospectados: number;
  total_reunioes_realizadas: number;
  total_vendas_realizadas: number;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters = Boolean(periodoInicio || periodoFim);
  const periodLabel = useMemo(() => {
    if (!hasFilters) return "Período total";
    if (periodoInicio && periodoFim) return `${periodoInicio} ate ${periodoFim}`;
    if (periodoInicio) return `A partir de ${periodoInicio}`;
    return `Ate ${periodoFim}`;
  }, [hasFilters, periodoFim, periodoInicio]);

  async function loadMetrics() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (periodoInicio) params.set("periodo_inicio", periodoInicio);
    if (periodoFim) params.set("periodo_fim", periodoFim);
    try {
      const response = await apiFetch<DashboardMetrics>(`/dashboard/metrics?${params.toString()}`);
      setMetrics(response);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível carregar o dashboard."));
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setPeriodoInicio("");
    setPeriodoFim("");
    setLoading(true);
    setError("");
    void apiFetch<DashboardMetrics>("/dashboard/metrics")
      .then((response) => {
        setMetrics(response);
      })
      .catch((err) => {
        setError(getFriendlyErrorMessage(err, "Não foi possível carregar o dashboard."));
        setMetrics(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    void loadMetrics();
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" badge="Visao executiva" />

      <section className="hero-panel">
        <div className="stack">
          <h3>Indicadores</h3>
          <div className="chip-row">
            <span className="chip chip-soft">{loading ? "Atualizando..." : periodLabel}</span>
          </div>
        </div>

        <div className="filter-inline-card">
          <label className="field">
            <span className="field-label">Período inicial</span>
            <input
              type="date"
              value={periodoInicio}
              onChange={(event) => setPeriodoInicio(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Período final</span>
            <input
              type="date"
              value={periodoFim}
              onChange={(event) => setPeriodoFim(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="primary-button wide-button" onClick={() => void loadMetrics()}>
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              className="secondary-button wide-button"
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Leads cadastrados" value={metrics?.total_leads ?? 0} />
        <MetricCard label="Leads prospectados" value={metrics?.total_leads_prospectados ?? 0} />
        <MetricCard
          label="Reunioes realizadas"
          value={metrics?.total_reunioes_realizadas ?? 0}
        />
        <MetricCard label="Vendas realizadas" value={metrics?.total_vendas_realizadas ?? 0} />
      </section>

      {error ? <div className="feedback error">{error}</div> : null}
    </>
  );
}
