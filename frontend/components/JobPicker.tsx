"use client";

import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import ui from "./ui.module.css";

/** Lets a job seeker who arrived at /apply directly (no job yet in mind) pick one. */
export default function JobPicker({ jobs }: { jobs: Job[] }) {
  const router = useRouter();

  if (jobs.length === 0) {
    return <p className={ui.hint}>No open roles right now — check back soon.</p>;
  }

  return (
    <div className={ui.field}>
      <label htmlFor="applyJobPicker">Choose a role</label>
      <select
        id="applyJobPicker"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) router.push(`/jobs/${e.target.value}/apply`);
        }}
      >
        <option value="" disabled>
          Select an open role…
        </option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title} — {job.location}
          </option>
        ))}
      </select>
    </div>
  );
}
