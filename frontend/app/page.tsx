import JobList from "@/components/JobList";
import JobSearchForm from "@/components/JobSearchForm";
import ui from "@/components/ui.module.css";
import { getJobs } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowseJobsPage({
  searchParams,
}: {
  searchParams: { title?: string; location?: string };
}) {
  let jobs: Job[] = [];
  let loadError: string | null = null;

  try {
    jobs = await getJobs({ title: searchParams.title, location: searchParams.location });
  } catch (error) {
    logger.error("Failed to load jobs for the Browse page", error);
    loadError = error instanceof Error ? error.message : "Could not load jobs.";
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Job seekers</p>
        <h2>Open roles</h2>
        <p className={ui.dek}>Search by title or location to find something that fits.</p>
      </div>

      <JobSearchForm />

      {loadError ? (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t load jobs</strong>
            <p>{loadError}</p>
          </div>
        </div>
      ) : (
        <JobList jobs={jobs} />
      )}
    </section>
  );
}
