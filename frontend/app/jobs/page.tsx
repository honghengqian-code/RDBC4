import JobList from "@/components/JobList";
import JobSearchForm from "@/components/JobSearchForm";
import Pagination from "@/components/Pagination";
import ui from "@/components/ui.module.css";
import { getJobs, JOB_PAGE_SIZE } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse jobs — Noticeboard" };

export default async function BrowseJobsPage({
  searchParams,
}: {
  searchParams: { title?: string; company?: string; location?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  let jobs: Job[] = [];
  let count = 0;
  let loadError: string | null = null;

  try {
    // Browse only ever shows open roles — closed ones simply drop off the list.
    const result = await getJobs({
      title: searchParams.title,
      company: searchParams.company,
      location: searchParams.location,
      status: "open",
      page,
    });
    jobs = result.results;
    count = result.count;
  } catch (error) {
    logger.error("Failed to load jobs for the Browse page", error);
    loadError = error instanceof Error ? error.message : "Could not load jobs.";
  }

  function makeHref(targetPage: number) {
    const params = new URLSearchParams();
    if (searchParams.title) params.set("title", searchParams.title);
    if (searchParams.company) params.set("company", searchParams.company);
    if (searchParams.location) params.set("location", searchParams.location);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Job seekers</p>
        <h2>Open roles</h2>
        <p className={ui.dek}>Search by title, company or location to find something that fits.</p>
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
        <>
          <JobList jobs={jobs} total={count} />
          <Pagination count={count} pageSize={JOB_PAGE_SIZE} currentPage={page} makeHref={makeHref} />
        </>
      )}
    </section>
  );
}
