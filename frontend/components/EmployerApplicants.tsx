"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getJob, getJobApplications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Application, Job } from "@/lib/types";
import ApplicantsList from "./ApplicantsList";
import ui from "./ui.module.css";

export default function EmployerApplicants({ jobId }: { jobId: number }) {
  const { token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getJob(jobId), getJobApplications(jobId, token)])
      .then(([jobData, applicationsData]) => {
        setJob(jobData);
        setApplications(applicationsData);
      })
      .catch((err) => {
        logger.error(`Failed to load applicants for job ${jobId}`, err);
        setError(err instanceof ApiError ? err.message : "Could not load applicants.");
      });
  }, [jobId, token]);

  if (error) {
    return (
      <div className={ui.errorBanner}>
        <div>
          <strong>Couldn&apos;t load applicants</strong>
          <p>{error}</p>
          <Link href="/employer/dashboard" className={ui.successLink}>
            ← Back to your roles
          </Link>
        </div>
      </div>
    );
  }

  if (!job || !applications) {
    return <p className={ui.hint}>Loading…</p>;
  }

  return <ApplicantsList job={job} applications={applications} />;
}
