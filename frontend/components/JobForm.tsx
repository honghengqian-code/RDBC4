"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, createJob, deleteJob, updateJob, ValidationError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { FieldErrors, Job, JobStatus } from "@/lib/types";
import { CheckIcon } from "./icons";
import ui from "./ui.module.css";

type FormState = {
  title: string;
  location: string;
  status: JobStatus;
  description: string;
};

const EMPTY_FORM: FormState = { title: "", location: "", status: "open", description: "" };

export default function JobForm({ job }: { job?: Job }) {
  const isEditing = Boolean(job);
  const { token } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    job
      ? { title: job.title, location: job.location, status: job.status, description: job.description }
      : EMPTY_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState<{ title: string; status: JobStatus } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateLocally(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.title.trim()) errors.title = ["Title is required."];
    if (!form.location.trim()) errors.location = ["Location is required."];
    if (!form.description.trim()) errors.description = ["Description is required."];
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!token) {
      setSubmitError("You've been signed out — please sign in again.");
      return;
    }

    const localErrors = validateLocally();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      logger.warn("Job form rejected client-side", localErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const savedJob = isEditing ? await updateJob(job!.id, form, token) : await createJob(form, token);
      setPosted({ title: savedJob.title, status: savedJob.status });
      if (!isEditing) setForm(EMPTY_FORM);
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fieldErrors);
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        logger.error(`Unexpected error ${isEditing ? "updating" : "posting"} a job`, error);
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!job || !token) return;
    const confirmed = window.confirm(
      `Delete "${job.title}"? This also removes every application submitted to it. This can't be undone.`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteJob(job.id, token);
      router.push("/employer/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteError(error.message);
      } else {
        logger.error("Unexpected error deleting a job", error);
        setDeleteError("Something went wrong. Please try again.");
      }
      setDeleting(false);
    }
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Employers</p>
        <h2>{isEditing ? "Edit role" : "Post a role"}</h2>
        <p className={ui.dek}>
          Fields mirror the <code>Job</code> model — title, description, location and status.
        </p>
      </div>

      {posted && (
        <div className={ui.successBanner}>
          <CheckIcon />
          <div>
            <strong>{isEditing ? "Role updated" : "Role posted"}</strong>
            <p>
              {`"${posted.title}" `}
              {posted.status === "open"
                ? isEditing
                  ? "is open and visible on Browse jobs."
                  : "now appears at the top of Browse jobs, open for applications."
                : isEditing
                  ? "is now Closed, and no longer shows on Browse jobs."
                  : "was saved as Closed, so it won't accept applications yet."}
            </p>
            <Link href="/employer/dashboard" className={ui.successLink}>
              Back to your roles →
            </Link>
          </div>
        </div>
      )}

      {submitError && (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t {isEditing ? "update" : "post"} this role</strong>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {deleteError && (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t delete this role</strong>
            <p>{deleteError}</p>
          </div>
        </div>
      )}

      <form className={ui.formShell} onSubmit={handleSubmit} noValidate>
        <div className={ui.fieldGroup}>
          <div className={`${ui.field} ${fieldErrors.title ? ui.fieldError : ""}`}>
            <label htmlFor="jobTitle">Job title</label>
            <input
              id="jobTitle"
              name="title"
              type="text"
              placeholder="e.g. Senior Backend Engineer"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            {fieldErrors.title && <p className={ui.errorMsg}>{fieldErrors.title[0]}</p>}
          </div>

          <div className={ui.row2}>
            <div className={`${ui.field} ${fieldErrors.location ? ui.fieldError : ""}`}>
              <label htmlFor="jobLocation">Location</label>
              <input
                id="jobLocation"
                name="location"
                type="text"
                placeholder="e.g. Remote, or Austin, TX"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
              {fieldErrors.location && <p className={ui.errorMsg}>{fieldErrors.location[0]}</p>}
            </div>
            <div className={ui.field}>
              <label htmlFor="jobStatus">Status</label>
              <select
                id="jobStatus"
                name="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as JobStatus)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <p className={ui.hint}>Job seekers can only apply to Open roles.</p>
            </div>
          </div>

          <div className={`${ui.field} ${fieldErrors.description ? ui.fieldError : ""}`}>
            <label htmlFor="jobDescription">Description</label>
            <textarea
              id="jobDescription"
              name="description"
              placeholder="What will they work on? What does the team need?"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
            {fieldErrors.description && <p className={ui.errorMsg}>{fieldErrors.description[0]}</p>}
          </div>
        </div>

        <div className={ui.formActions}>
          <button className={ui.primaryBtn} type="submit" disabled={submitting || deleting}>
            {submitting ? (isEditing ? "Updating…" : "Publishing…") : isEditing ? "Update role" : "Publish role"}
          </button>
          {isEditing && (
            <button type="button" className={ui.dangerBtn} onClick={handleDelete} disabled={submitting || deleting}>
              {deleting ? "Deleting…" : "Delete role"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
