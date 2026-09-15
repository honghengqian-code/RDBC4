"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getJob } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";
import JobForm from "./JobForm";
import ui from "./ui.module.css";

export default function EmployerJobEdit({ jobId }: { jobId: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJob(jobId)
      .then(setJob)
      .catch((err) => {
        logger.error(`Failed to load job ${jobId} for editing`, err);
        setError(err instanceof ApiError ? err.message : "Could not load this role.");
      });
  }, [jobId]);

  if (error) {
    return (
      <div className={ui.errorBanner}>
        <div>
          <strong>Couldn&apos;t load this role</strong>
          <p>{error}</p>
          <Link href="/employer/dashboard" className={ui.successLink}>
            ← Back to your roles
          </Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return <p className={ui.hint}>Loading…</p>;
  }

  return <JobForm job={job} />;
}
