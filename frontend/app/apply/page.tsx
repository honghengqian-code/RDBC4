import JobPicker from "@/components/JobPicker";
import ui from "@/components/ui.module.css";
import { getJobs } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apply — Noticeboard" };

export default async function ApplyLandingPage() {
  let openJobs: Job[] = [];
  let loadError: string | null = null;

  try {
    const jobs = await getJobs();
    openJobs = jobs.filter((job) => job.status === "open");
  } catch (error) {
    logger.error("Failed to load open jobs for the Apply picker", error);
    loadError = error instanceof Error ? error.message : "Could not load open roles.";
  }

  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">Job seekers</p>
        <h2>Apply for a role</h2>
        <p className={ui.dek}>Pick a role below, or apply directly from a listing in Browse jobs.</p>
      </div>

      {loadError ? (
        <div className={ui.errorBanner}>
          <div>
            <strong>Couldn&apos;t load open roles</strong>
            <p>{loadError}</p>
          </div>
        </div>
      ) : (
        <JobPicker jobs={openJobs} />
      )}
    </section>
  );
}
