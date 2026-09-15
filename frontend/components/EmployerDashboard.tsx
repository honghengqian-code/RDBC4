"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getEmployerJobs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";
import JobList from "./JobList";
import styles from "./EmployerDashboard.module.css";
import ui from "./ui.module.css";

export default function EmployerDashboard() {
  const { employer, token } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getEmployerJobs(token)
      .then(setJobs)
      .catch((error) => {
        logger.error("Failed to load the employer's jobs", error);
        setLoadError(error instanceof ApiError ? error.message : "Could not load your jobs.");
      });
  }, [token]);

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">{employer?.name}</p>
        <h2>Your roles</h2>
        <p className={ui.dek}>Everything you&apos;ve posted, and who&apos;s applied.</p>
      </div>

      <div className={styles.actions}>
        <Link href="/employer/post" className={styles.postCta}>
          Post a role
        </Link>
      </div>

      {loadError ? (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t load your roles</strong>
            <p>{loadError}</p>
          </div>
        </div>
      ) : jobs === null ? (
        <p className={ui.hint}>Loading…</p>
      ) : (
        <JobList jobs={jobs} variant="employer" />
      )}
    </section>
  );
}
