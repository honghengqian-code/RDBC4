import Link from "next/link";
import { formatRelativeTime, jobReqCode } from "@/lib/format";
import type { Application, Job } from "@/lib/types";
import { ChevronRightIcon, LocationIcon, PaperclipIcon, PeopleIcon } from "./icons";
import listStyles from "./JobList.module.css";
import styles from "./ApplicantsList.module.css";
import ui from "./ui.module.css";

export default function ApplicantsList({ job, applications }: { job: Job; applications: Application[] }) {
  return (
    <section>
      <Link href="/employer/dashboard" className={`${ui.ghostLink} ${styles.backLink}`}>
        ← Your roles
      </Link>

      <div className={ui.panelHead}>
        <p className="eyebrow">Employers</p>
        <h2>Applicants</h2>
        <p className={ui.dek}>Click into anyone below to see their full application.</p>
      </div>

      <div className={ui.applyContext}>
        <div className={`${ui.applyContextStatus} ${job.status === "open" ? ui.pillOpen : ui.pillClosed}`}>
          {job.status === "open" ? "Open" : "Closed"}
        </div>
        <h3 className={ui.applyContextTitle}>{job.title}</h3>
        <div className={`${listStyles.jobMeta} ${ui.applyContextMetaSpacing}`}>
          <span>
            <LocationIcon />
            {job.location}
          </span>
          <span className={ui.reqCode}>{jobReqCode(job.id)}</span>
          <span>
            <PeopleIcon />
            {`${applications.length} applicant${applications.length === 1 ? "" : "s"}`}
          </span>
          <span className={ui.metaFaint}>{formatRelativeTime(job.posted_at)}</span>
        </div>
      </div>

      {applications.length === 0 ? (
        <p className={styles.emptyState}>No one has applied to this role yet.</p>
      ) : (
        <div className={styles.applicantRows}>
          {applications.map((application) => (
            <Link
              href={`/jobs/${job.id}/applicants/${application.id}`}
              className={styles.applicantRow}
              key={application.id}
            >
              <div className={styles.applicantMain}>
                <strong className={styles.applicantName}>{application.applicant_name}</strong>
                <span className={styles.applicantEmail}>{application.applicant_email}</span>
              </div>
              <div className={styles.applicantRowRight}>
                {application.attachments.length > 0 && (
                  <span className={styles.attachmentBadge}>
                    <PaperclipIcon size={12} />
                    {application.attachments.length}
                  </span>
                )}
                <span className={styles.applicantWhen}>{formatRelativeTime(application.applied_at)}</span>
                <ChevronRightIcon />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
