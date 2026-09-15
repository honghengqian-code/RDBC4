import Link from "next/link";
import { formatRelativeTime, jobReqCode } from "@/lib/format";
import type { Job } from "@/lib/types";
import { LocationIcon } from "./icons";
import styles from "./JobList.module.css";
import ui from "./ui.module.css";

export default function JobList({
  jobs,
  variant = "seeker",
}: {
  jobs: Job[];
  variant?: "seeker" | "employer";
}) {
  return (
    <>
      <p className={styles.resultCount}>
        <span>{jobs.length}</span> role{jobs.length === 1 ? "" : "s"} shown
      </p>

      {jobs.length === 0 ? (
        <p className={styles.emptyState}>No roles match that search. Try clearing a filter.</p>
      ) : (
        <div className={styles.jobRows}>
          {jobs.map((job) => (
            <div className={styles.jobRow} key={job.id}>
              <div className={styles.jobRowMain}>
                <div className={styles.jobRowTop}>
                  <span className={`${ui.pill} ${job.status === "open" ? ui.pillOpen : ui.pillClosed}`}>
                    {job.status === "open" ? "Open" : "Closed"}
                  </span>
                  <span className={ui.reqCode}>{jobReqCode(job.id)}</span>
                  <span className={styles.postedAt}>{formatRelativeTime(job.posted_at)}</span>
                </div>
                <h3>{job.title}</h3>
                <p className={styles.jobDesc}>{job.description}</p>
                <div className={styles.jobMeta}>
                  <span>
                    <LocationIcon />
                    {job.location}
                  </span>
                </div>
              </div>
              <div className={styles.jobRowSide}>
                {variant === "employer" ? (
                  <Link href={`/jobs/${job.id}/applicants`} className={styles.applyBtn}>
                    View applicants
                  </Link>
                ) : job.status === "open" ? (
                  <Link href={`/jobs/${job.id}/apply`} className={styles.applyBtn}>
                    View &amp; apply
                  </Link>
                ) : (
                  <span className={styles.applyBtnDisabled}>Closed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
