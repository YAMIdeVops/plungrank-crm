"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { AuthUser } from "@/entities/user/model/types";
import { useAuth } from "@/features/auth/model/auth-provider";
import { apiFetch } from "@/shared/api/http";
import { formatDateDisplay } from "@/shared/lib/date-display";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

type UserRecord = AuthUser & {
  criado_em?: string;
  atualizado_em?: string;
};

const initialForm = { nome: "", email: "", password: "", perfil: "PADRAO", status: "ACTIVE" };

function getStatusLabel(value: string) {
  if (value === "ACTIVE" || value === "ATIVO") return "Ativo";
  if (value === "INACTIVE" || value === "INATIVO") return "Inativo";
  return value;
}

function formatCreatedAt(value?: string) {
  return formatDateDisplay(value);
}

export default function UsersAdminPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canAccess = user?.perfil === "ADMIN";
  const tableHeaders = useMemo(() => {
    const headers: string[] = [];
    if (canAccess) headers.push("Ações");
    headers.push("Nome", "E-mail", "Perfil", "Status", "Criado em");
    return headers;
  }, [canAccess]);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await apiFetch<{ items: UserRecord[] }>("/users");
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canAccess) void loadUsers();
  }, [canAccess]);

  function resetFormState() {
    setForm(initialForm);
    setEditingUserId(null);
  }

  function startEdit(targetUser: UserRecord) {
    setForm({
      nome: targetUser.nome,
      email: targetUser.email,
      password: "",
      perfil: targetUser.perfil,
      status: targetUser.status,
    });
    setEditingUserId(targetUser.id);
    setError("");
    setFeedback("Modo de edição ativo.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      if (editingUserId) {
        const payload: Record<string, string> = {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          status: form.status,
        };
        if (form.password.trim()) payload.password = form.password;

        await apiFetch<UserRecord>(`/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFeedback("Usuário atualizado com sucesso.");
      } else {
        await apiFetch<UserRecord>("/users", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setFeedback("Usuário criado com sucesso.");
      }

      resetFormState();
      void loadUsers();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, editingUserId ? "Não foi possível atualizar o usuário." : "Não foi possível criar o usuário."));
    }
  }

  async function handleDelete(targetUser: UserRecord) {
    const confirmed = window.confirm(`Excluir o usuário "${targetUser.nome}" removerá esse cadastro da base. Deseja continuar?`);
    if (!confirmed) return;

    setError("");
    setFeedback("");
    try {
      const response = await apiFetch<{ message?: string }>(`/users/${targetUser.id}`, { method: "DELETE" });
      setFeedback(response.message ?? "Usuário excluído com sucesso.");
      if (editingUserId === targetUser.id) resetFormState();
      void loadUsers();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível excluir o usuário."));
    }
  }

  if (!canAccess) {
    return (
      <>
        <PageHeader title="Usuários" badge="Restrito" />
        <div className="feedback error">Seu perfil não possui acesso administrativo.</div>
      </>
    );
  }

  const rows = items.map((item) => {
    const row: ReactNode[] = [];
    row.push(
      <div className="table-actions" key={`actions-${item.id}`}>
        <button className="ghost-button" type="button" onClick={() => startEdit(item)}>Editar</button>
        <button className="danger-button" type="button" onClick={() => void handleDelete(item)}>Excluir</button>
      </div>,
    );
    row.push(item.nome, item.email, item.perfil, getStatusLabel(item.status), formatCreatedAt(item.criado_em));
    return row;
  });

  return (
    <>
      <PageHeader title="Usuários" badge="Acesso" />

      <section className="panel panel-primary stack-lg">
        <div className="panel-header">
          <h3>{editingUserId ? "Editar usuário" : "Novo usuário"}</h3>
        </div>

        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Dados</h4>
            </div>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Nome</span>
                <input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ana Souza" required />
              </label>
              <label className="field">
                <span className="field-label">E-mail</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ana@empresa.com" required />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Senha</span>
                <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingUserId ? "Preencha apenas para trocar a senha" : "Mínimo de 8 caracteres"} required={!editingUserId} />
              </label>
              <label className="field">
                <span className="field-label">Perfil</span>
                <select value={form.perfil} onChange={(event) => setForm({ ...form, perfil: event.target.value })}>
                  <option value="PADRAO">Padrão</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-actions field-span-2">
            <button className="primary-button" type="submit">{editingUserId ? "Salvar" : "Criar usuário"}</button>
            <button className="secondary-button" type="button" onClick={() => { resetFormState(); setError(""); setFeedback(""); }}>
              {editingUserId ? "Cancelar" : "Limpar"}
            </button>
          </div>
        </form>

        {error ? <div className="feedback error">{error}</div> : null}
        {feedback ? <div className="feedback">{feedback}</div> : null}
      </section>

      <section className="panel panel-table stack">
        <div className="panel-header">
          <h3>Listagem</h3>
        </div>
        <DataTable caption={`${items.length} usuário(s)`} headers={tableHeaders} rows={rows} loading={loading} emptyMessage="Nenhum usuário cadastrado." />
      </section>
    </>
  );
}
