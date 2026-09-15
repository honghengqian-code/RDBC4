"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getApplication, getJob, MEDIA_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRelativeTime, jobReqCode } from "@/lib/format";
import { logger } from "@/lib/logger";
import type { Application, Job } from "@/lib/types";
import styles from "./EmployerApplicationDetail.module.css";
import ui from "./ui.module.css";

function attachmentName(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function EmployerApplicationDetail({
  jobId,
  applicationId,
}: {
  jobId: number;
  applicationId: number;
}) {
  const { token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getJob(jobId), getApplication(applicationId, token)])
      .then(([jobData, applicationData]) => {
        setJob(jobData);
        setApplication(applicationData);
      })
      .catch((err) => {
        logger.error(`Failed to load application ${applicationId}`, err);
        setError(err instanceof ApiError ? err.message : "Could not load this application.");
      });
  }, [jobId, applicationId, token]);

  if (error) {
    return (
      <div className={ui.errorBanner}>
        <div>
          <strong>Couldn&apos;t load this application</strong>
          <p>{error}</p>
          <Link href={`/jobs/${jobId}/applicants`} className={ui.successLink}>
            ← Back to applicants
          </Link>
        </div>
      </div>
    );
  }

  if (!job || !application) {
    return <p className={ui.hint}>Loading…</p>;
  }

  return (
    <section>
      <Link href={`/jobs/${jobId}/applicants`} className={`${ui.ghostLink} ${styles.backLink}`}>
        ← All applicants for {job.title}
      </Link>

      <div className={ui.panelHead}>
        <p className="eyebrow">Employers</p>
        <h2>{application.applicant_name}</h2>
        <p className={ui.dek}>{application.applicant_email}</p>
      </div>

      <div className={styles.metaRow}>
        <span>{jobReqCode(job.id)}</span>
        <span>Applied {formatRelativeTime(application.applied_at)}</span>
      </div>

      <div className={styles.descCard}>
        <h3>Application</h3>
        <p>{application.description}</p>
      </div>

      {application.attachments.length > 0 && (
        <div className={styles.attachmentsSection}>
          <h3>Attachments</h3>
          <div className={ui.attachments}>
            {application.attachments.map((attachment) => (
              <a
                key={attachment.id}
                className={ui.attachmentChip}
                href={`${MEDIA_BASE_URL}${attachment.file}`}
                target="_blank"
                rel="noreferrer"
              >
                {attachmentName(attachment.file)}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
