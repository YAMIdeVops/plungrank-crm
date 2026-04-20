"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/model/auth-provider";
import { apiFetch } from "@/shared/api/http";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import type { ServiceItem } from "@/shared/model/types";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

const initialForm = { nome_servico: "", valor: "" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

export default function ServicesPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === "ADMIN";

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const tableHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canManage) headers.push("Ações");
    headers.push("ID", "Serviço", "Valor");
    return headers;
  }, [canManage]);

  async function loadServices() {
    setLoading(true);
    try {
      const response = await apiFetch<{ items: ServiceItem[] }>("/services");
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  function resetFormState() {
    setForm(initialForm);
    setEditingServiceId(null);
  }

  function startEdit(service: ServiceItem) {
    setForm({ nome_servico: service.nome_servico, valor: String(service.valor) });
    setEditingServiceId(service.id_servico);
    setError("");
    setFeedback("Modo de edição ativo.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      const payload = { nome_servico: form.nome_servico, valor: Number(form.valor) };

      if (editingServiceId) {
        await apiFetch<ServiceItem>(`/services/${editingServiceId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setFeedback("Serviço atualizado com sucesso.");
      } else {
        await apiFetch<ServiceItem>("/services", { method: "POST", body: JSON.stringify(payload) });
        setFeedback("Serviço cadastrado com sucesso.");
      }

      resetFormState();
      void loadServices();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, editingServiceId ? "Não foi possível atualizar o serviço." : "Não foi possível cadastrar o serviço."));
    }
  }

  async function handleDelete(service: ServiceItem) {
    const confirmed = window.confirm(`Excluir o serviço "${service.nome_servico}" pode impactar o histórico comercial. Deseja continuar?`);
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message?: string }>(`/services/${service.id_servico}`, { method: "DELETE" });
      setFeedback(response.message ?? "Serviço excluído com sucesso.");
      if (editingServiceId === service.id_servico) resetFormState();
      void loadServices();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir o serviço."));
    }
  }

  const rows = items.map((item) => {
    const row: ReactNode[] = [];
    if (canManage) {
      row.push(
        <div className="table-actions" key={`actions-${item.id_servico}`}>
          <button className="ghost-button" type="button" onClick={() => startEdit(item)}>Editar</button>
          <button className="danger-button" type="button" onClick={() => void handleDelete(item)}>Excluir</button>
        </div>,
      );
    }
    row.push(item.id_servico, item.nome_servico, formatCurrency(item.valor));
    return row;
  });

  return (
    <>
      <PageHeader title="Serviços" badge="Catálogo" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>{editingServiceId ? "Editar serviço" : "Novo serviço"}</h3>
        </div>

        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Dados</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Nome do serviço</span>
                <input value={form.nome_servico} onChange={(event) => setForm({ ...form, nome_servico: event.target.value })} placeholder="Tráfego pago" required disabled={!canManage} />
              </label>
              <label className="field">
                <span className="field-label">Valor</span>
                <input type="number" min="0" step="0.01" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} placeholder="1500.00" required disabled={!canManage} />
              </label>
            </div>
          </div>

          {canManage ? (
            <div className="form-actions field-span-2">
              <button className="primary-button" type="submit">{editingServiceId ? "Salvar" : "Cadastrar serviço"}</button>
              <button className="secondary-button" type="button" onClick={() => { resetFormState(); setError(""); setFeedback(""); }}>
                {editingServiceId ? "Cancelar" : "Limpar"}
              </button>
            </div>
          ) : null}
        </form>

        {error ? <div className="feedback error">{error}</div> : null}
        {feedback ? <div className="feedback">{feedback}</div> : null}
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} serviço(s)`} headers={tableHeaders} rows={rows} loading={loading} emptyMessage="Nenhum serviço cadastrado." />
      </section>
    </>
  );
}
