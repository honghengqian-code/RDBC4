"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import ui from "./ui.module.css";

export default function EmployerLoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ contact_email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(form, rememberMe);
      router.push("/employer/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        logger.error("Unexpected error logging in", err);
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Employers</p>
        <h2>Sign in</h2>
        <p className={ui.dek}>
          New here?{" "}
          <Link href="/employer/register" className={ui.successLink}>
            Create an account →
          </Link>
        </p>
      </div>

      {error && (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t sign you in</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <form className={ui.formShell} onSubmit={handleSubmit} noValidate>
        <div className={ui.fieldGroup}>
          <div className={ui.field}>
            <label htmlFor="loginEmail">Work email</label>
            <input
              id="loginEmail"
              type="email"
              autoComplete="email"
              value={form.contact_email}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
            />
          </div>

          <div className={ui.field}>
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <div className={ui.checkboxRow}>
            <input
              id="loginRememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="loginRememberMe">Remember me on this device</label>
          </div>
        </div>

        <div className={ui.formActions}>
          <button className={ui.primaryBtn} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </section>
  );
}
