import Link from "next/link";
import { notFound } from "next/navigation";
import ApplicationForm from "@/components/ApplicationForm";
import ui from "@/components/ui.module.css";
import { ApiError, getJob } from "@/lib/api";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function ApplyToJobPage({ params }: { params: { id: string } }) {
  const jobId = Number(params.id);
  if (!Number.isInteger(jobId)) notFound();

  try {
    const job = await getJob(jobId);
    return <ApplicationForm job={job} applicantCount={job.applicant_count} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    logger.error(`Failed to load job ${jobId} for the Apply page`, error);
    const message = error instanceof Error ? error.message : "Could not load this job.";
    return (
      <div className={ui.errorBanner}>
        <div>
          <strong>Couldn&apos;t open this role</strong>
          <p>{message}</p>
          <Link href="/jobs" className={ui.successLink}>
            Back to Browse jobs →
          </Link>
        </div>
      </div>
    );
  }
}
