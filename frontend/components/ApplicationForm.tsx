"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { formatRelativeTime, jobReqCode } from "@/lib/format";
import { ApiError, createApplication, ValidationError } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { FieldErrors, Job } from "@/lib/types";
import { CheckIcon, LocationIcon, PeopleIcon } from "./icons";
import layout from "./ApplicationForm.module.css";
import styles from "./JobList.module.css";
import ui from "./ui.module.css";

type FormState = { applicant_name: string; applicant_email: string; description: string };
const EMPTY_FORM: FormState = { applicant_name: "", applicant_email: "", description: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)}KB` : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function ApplicationForm({ job, applicantCount }: { job: Job; applicantCount: number }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAttachmentsChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    // Reset the native input immediately so its own "N files chosen" label
    // never drifts from the list we render below, and the same file can be
    // picked again later (e.g. after being removed).
    event.target.value = "";

    const oversized = incoming.filter((file) => file.size > MAX_ATTACHMENT_BYTES);
    const accepted = incoming.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);

    if (oversized.length > 0) {
      setFieldErrors((prev) => ({
        ...prev,
        attachments: [`${oversized.map((file) => `"${file.name}"`).join(", ")} exceed the 5MB limit.`],
      }));
    } else {
      setFieldErrors((prev) => {
        if (!("attachments" in prev)) return prev;
        const rest = { ...prev };
        delete rest.attachments;
        return rest;
      });
    }
    if (accepted.length > 0) setAttachments((prev) => [...prev, ...accepted]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function validateLocally(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.applicant_name.trim()) errors.applicant_name = ["Name is required."];
    if (!EMAIL_RE.test(form.applicant_email.trim())) errors.applicant_email = ["A valid email is required."];
    if (!form.description.trim()) errors.description = ["A short description is required."];
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
      await createApplication({ job: job.id, ...form, attachments });
      setSubmitted(true);
      setForm(EMPTY_FORM);
      setAttachments([]);
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
      </div>

      {submitted ? (
        <div className={ui.successBanner}>
          <CheckIcon />
          <div>
            <strong>{`Application sent to ${job.title}`}</strong>
            <p>{`It's now attached to ${jobReqCode(job.id)} — ${job.location}.`}</p>
            <Link href="/jobs" className={ui.successLink}>
              Browse more roles →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {submitError && (
            <div className={ui.errorBanner}>
              <div>
                <strong>Couldn&apos;t submit your application</strong>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <form className={layout.layout} onSubmit={handleSubmit} noValidate>
            <div className={`${ui.applyContext} ${layout.contextCell}`}>
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
            </div>

            <div className={`${ui.fieldGroup} ${layout.topFieldsCell}`}>
              <div className={ui.row2}>
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
              </div>

              <div className={`${ui.field} ${fieldErrors.description ? ui.fieldError : ""}`}>
                <label htmlFor="applicationDescription">Description</label>
                <textarea
                  id="applicationDescription"
                  name="description"
                  placeholder="Why you — and why this role."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
                {fieldErrors.description && <p className={ui.errorMsg}>{fieldErrors.description[0]}</p>}
              </div>
            </div>

            <div className={layout.bottomFieldsCell}>
              <div className={`${ui.field} ${fieldErrors.attachments ? ui.fieldError : ""}`}>
                <label htmlFor="applicationAttachments">Attachments</label>
                <input
                  id="applicationAttachments"
                  name="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleAttachmentsChange}
                />
                {attachments.length > 0 && (
                  <div className={layout.attachmentList}>
                    {attachments.map((file, index) => (
                      <div className={layout.attachmentRow} key={`${file.name}-${file.size}-${index}`}>
                        <span className={layout.attachmentName}>{file.name}</span>
                        <span className={layout.attachmentSize}>{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          className={layout.attachmentRemove}
                          onClick={() => removeAttachment(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fieldErrors.attachments ? (
                  <p className={ui.errorMsg}>{fieldErrors.attachments[0]}</p>
                ) : (
                  <p className={ui.hint}>Optional — a resume, portfolio, or both. Up to 5MB each.</p>
                )}
              </div>

              <div className={ui.formActions}>
                <button className={ui.primaryBtn} type="submit" disabled={submitting || job.status !== "open"}>
                  {submitting ? "Sending…" : "Send application"}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
