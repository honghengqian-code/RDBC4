"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, ValidationError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { FieldErrors } from "@/lib/types";
import ui from "./ui.module.css";

type FormState = { name: string; contact_email: string; password: string };
const EMPTY_FORM: FormState = { name: "", contact_email: "", password: "" };

export default function EmployerRegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await register(form);
      router.push("/employer/dashboard");
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fieldErrors);
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        logger.error("Unexpected error registering an employer", error);
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Employers</p>
        <h2>Create an account</h2>
        <p className={ui.dek}>
          Already have one?{" "}
          <Link href="/employer" className={ui.successLink}>
            Sign in →
          </Link>
        </p>
      </div>

      {submitError && (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t create your account</strong>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      <form className={ui.formShell} onSubmit={handleSubmit} noValidate>
        <div className={ui.fieldGroup}>
          <div className={`${ui.field} ${fieldErrors.name ? ui.fieldError : ""}`}>
            <label htmlFor="regName">Company name</label>
            <input
              id="regName"
              type="text"
              placeholder="Acme Corp"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            {fieldErrors.name && <p className={ui.errorMsg}>{fieldErrors.name[0]}</p>}
          </div>

          <div className={`${ui.field} ${fieldErrors.contact_email ? ui.fieldError : ""}`}>
            <label htmlFor="regEmail">Work email</label>
            <input
              id="regEmail"
              type="email"
              autoComplete="email"
              placeholder="hr@acme.com"
              value={form.contact_email}
              onChange={(e) => updateField("contact_email", e.target.value)}
            />
            {fieldErrors.contact_email && <p className={ui.errorMsg}>{fieldErrors.contact_email[0]}</p>}
          </div>

          <div className={`${ui.field} ${fieldErrors.password ? ui.fieldError : ""}`}>
            <label htmlFor="regPassword">Password</label>
            <input
              id="regPassword"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
            />
            {fieldErrors.password ? (
              <p className={ui.errorMsg}>{fieldErrors.password[0]}</p>
            ) : (
              <p className={ui.hint}>At least 8 characters.</p>
            )}
          </div>
        </div>

        <div className={ui.formActions}>
          <button className={ui.primaryBtn} type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </div>
      </form>
    </section>
  );
}
