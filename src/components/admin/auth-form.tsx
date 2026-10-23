"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "../shop/header";
export function AuthForm({
  configured,
  reset = false,
}: {
  configured: boolean;
  reset?: boolean;
}) {
  const [mode, setMode] = useState(reset ? "reset" : "login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main id="conteudo" className="auth-page">
      <div className="auth-brand">
        <Wordmark />
        <p>
          O cuidado com a marca
          <br />
          começa nos detalhes.
        </p>
        <span>MAISON · ADMINISTRAÇÃO</span>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">Bem-vinda à sua Maison</p>
        <h1>
          {mode === "login"
            ? "Entre no seu espaço."
            : mode === "reset"
              ? "Uma nova senha."
              : "Vamos recuperar seu acesso."}
        </h1>
        <p className="muted">
          {mode === "login"
            ? "Gerencie suas peças, sua vitrine e cada oportunidade."
            : "Siga as instruções para acessar sua conta com segurança."}
        </p>
        {!configured && (
          <p className="notice">
            Configure o Supabase e provisione a primeira proprietária conforme o
            README para habilitar o acesso.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            setBusy(true);
            const form = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: mode,
                  email: form.get("email"),
                  password: form.get("password"),
                }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              if (mode === "recover") setMessage(data.message);
              else {
                router.replace("/admin");
                router.refresh();
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Falha ao entrar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode !== "reset" && (
            <label>
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
          )}
          {mode !== "recover" && (
            <label>
              {mode === "reset"
                ? "Nova senha (mínimo de 12 caracteres)"
                : "Senha"}
              <input
                name="password"
                type="password"
                minLength={mode === "reset" ? 12 : 1}
                maxLength={128}
                autoComplete={
                  mode === "reset" ? "new-password" : "current-password"
                }
                required
              />
            </label>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice success">
              {message}
            </p>
          )}
          <button className="button full" disabled={busy || !configured}>
            {busy
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar →"
                : mode === "reset"
                  ? "Salvar nova senha"
                  : "Enviar instruções"}
          </button>
        </form>
        {!reset && (
          <button
            className="text-link"
            onClick={() => {
              setMode(mode === "recover" ? "login" : "recover");
              setError("");
              setMessage("");
            }}
          >
            {mode === "recover" ? "Voltar ao acesso" : "Esqueci minha senha"}
          </button>
        )}
        <Link href="/" className="back-store">
          ← Voltar à loja
        </Link>
      </div>
    </main>
  );
}
