"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatRelativeTime, jobReqCode } from "@/lib/format";
import { ApiError, createApplication, ValidationError } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { FieldErrors, Job } from "@/lib/types";
import { CheckIcon, LocationIcon, PeopleIcon } from "./icons";
import styles from "./JobList.module.css";
import ui from "./ui.module.css";

type FormState = { applicant_name: string; applicant_email: string; cover_letter: string };
const EMPTY_FORM: FormState = { applicant_name: "", applicant_email: "", cover_letter: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplicationForm({ job, applicantCount }: { job: Job; applicantCount: number }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateLocally(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.applicant_name.trim()) errors.applicant_name = ["Name is required."];
    if (!EMAIL_RE.test(form.applicant_email.trim())) errors.applicant_email = ["A valid email is required."];
    if (!form.cover_letter.trim()) errors.cover_letter = ["A short cover letter is required."];
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const localErrors = validateLocally();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      logger.warn("Application form rejected client-side", localErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      await createApplication({ job: job.id, ...form });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fieldErrors);
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        logger.error("Unexpected error submitting an application", error);
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Job seekers</p>
        <h2>Apply for a role</h2>
        <p className={ui.dek}>Submits your name, email and a cover letter, linked to this job post.</p>
      </div>

      {submitted ? (
        <div className={ui.successBanner}>
          <CheckIcon />
          <div>
            <strong>{`Application sent to ${job.title}`}</strong>
            <p>{`It's now attached to ${jobReqCode(job.id)} — ${job.location}.`}</p>
            <Link href="/" className={ui.successLink}>
              Browse more roles →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={ui.applyContext}>
            <div className={`${ui.applyContextStatus} ${job.status === "open" ? ui.pillOpen : ui.pillClosed}`}>
              {job.status === "open" ? "Open" : "Closed"}
            </div>
            <h3 className={ui.applyContextTitle}>{job.title}</h3>
            <div className={`${styles.jobMeta} ${ui.applyContextMetaSpacing}`}>
              <span>
                <LocationIcon />
                {job.location}
              </span>
              <span className={ui.reqCode}>{jobReqCode(job.id)}</span>
              <span>
                <PeopleIcon />
                {`${applicantCount} applicant${applicantCount === 1 ? "" : "s"} so far`}
              </span>
              <span className={ui.metaFaint}>{formatRelativeTime(job.posted_at)}</span>
            </div>
            <p className={ui.applyContextDesc}>{job.description}</p>
          </div>

          {submitError && (
            <div className={ui.errorBanner}>
              <div>
                <strong>Couldn&apos;t submit your application</strong>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <form className={ui.formShell} onSubmit={handleSubmit} noValidate>
            <div className={ui.fieldGroup}>
              <div className={`${ui.field} ${fieldErrors.applicant_name ? ui.fieldError : ""}`}>
                <label htmlFor="applicantName">Full name</label>
                <input
                  id="applicantName"
                  name="applicant_name"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.applicant_name}
                  onChange={(e) => updateField("applicant_name", e.target.value)}
                />
                {fieldErrors.applicant_name && <p className={ui.errorMsg}>{fieldErrors.applicant_name[0]}</p>}
              </div>

              <div className={`${ui.field} ${fieldErrors.applicant_email ? ui.fieldError : ""}`}>
                <label htmlFor="applicantEmail">Email</label>
                <input
                  id="applicantEmail"
                  name="applicant_email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.applicant_email}
                  onChange={(e) => updateField("applicant_email", e.target.value)}
                />
                {fieldErrors.applicant_email && <p className={ui.errorMsg}>{fieldErrors.applicant_email[0]}</p>}
              </div>

              <div className={`${ui.field} ${fieldErrors.cover_letter ? ui.fieldError : ""}`}>
                <label htmlFor="coverLetter">Cover letter</label>
                <textarea
                  id="coverLetter"
                  name="cover_letter"
                  placeholder="Why you — and why this role."
                  value={form.cover_letter}
                  onChange={(e) => updateField("cover_letter", e.target.value)}
                />
                {fieldErrors.cover_letter && <p className={ui.errorMsg}>{fieldErrors.cover_letter[0]}</p>}
              </div>
            </div>

            <div className={ui.formActions}>
              <button className={ui.primaryBtn} type="submit" disabled={submitting || job.status !== "open"}>
                {submitting ? "Sending…" : "Send application"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
