"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

import { useAuth } from "@/features/auth/model/auth-provider";
import { getFriendlyErrorMessage } from "@/shared/lib/rule-violations";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Falha ao autenticar."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page login-reference-page">
      <div className="login-reference-center">
        <form className="login-reference-card" onSubmit={handleSubmit}>
          <div className="login-reference-brand">
            <Image
              src="/logo/logotipo.png"
              alt="CRM PlungRank"
              width={116}
              height={116}
              className="login-reference-logo"
              priority
            />
            <h1>CRM PlungRank</h1>
            <p className="login-reference-tagline">
              Relacione. Entenda. <span>Venda mais.</span>
            </p>
          </div>

          <div className="login-reference-divider" />

          <div className="login-reference-copy">
            <h2>Acesse sua conta</h2>
            <p>Entre com suas credenciais para continuar</p>
          </div>

          <label className="login-reference-field">
            <span className="login-reference-field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6.5h16c.6 0 1 .4 1 1v9c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1v-9c0-.6.4-1 1-1Zm0 1.8v.2l8 5.2 8-5.2v-.2H4Zm16 7.4V10.5l-7.5 4.9a1 1 0 0 1-1 0L4 10.5v5.2h16Z" />
              </svg>
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="E-mail"
              required
            />
          </label>

          <label className="login-reference-field">
            <span className="login-reference-field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h10c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm2 9.8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6ZM8 18v-7h8v7H8Z" />
              </svg>
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              required
            />
            <button
              type="button"
              className="login-reference-visibility"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 6.5c5.3 0 9.5 5.1 9.7 5.4.2.2.2.5 0 .7-.2.3-4.4 5.4-9.7 5.4S2.5 12.9 2.3 12.6a.6.6 0 0 1 0-.7C2.5 11.6 6.7 6.5 12 6.5Zm0 9.8c3.7 0 6.8-3 6.8-4.6 0-1.6-3.1-4.6-6.8-4.6-3.7 0-6.8 3-6.8 4.6 0 1.6 3.1 4.6 6.8 4.6Zm0-7.5a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" />
              </svg>
            </button>
          </label>

          {error ? <div className="login-reference-error">{error}</div> : null}

          <button className="login-reference-submit" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
