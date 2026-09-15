"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getEmployerJobs, JOB_PAGE_SIZE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";
import JobList from "./JobList";
import Pagination from "./Pagination";
import styles from "./EmployerDashboard.module.css";
import ui from "./ui.module.css";

export default function EmployerDashboard() {
  const { employer, token } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [count, setCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setJobs(null);
    getEmployerJobs(token, page)
      .then((result) => {
        setJobs(result.results);
        setCount(result.count);
      })
      .catch((error) => {
        logger.error("Failed to load the employer's jobs", error);
        setLoadError(error instanceof ApiError ? error.message : "Could not load your jobs.");
      });
  }, [token, page]);

  function makeHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage > 1) params.set("page", String(targetPage));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

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
        <>
          <JobList jobs={jobs} variant="employer" total={count} />
          <Pagination count={count} pageSize={JOB_PAGE_SIZE} currentPage={page} makeHref={makeHref} />
        </>
      )}
    </section>
  );
}
