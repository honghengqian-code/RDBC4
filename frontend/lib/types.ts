export type JobStatus = "open" | "closed";

export interface Job {
  id: number;
  employer: number | null;
  title: string;
  description: string;
  location: string;
  status: JobStatus;
  posted_at: string;
}

export interface Application {
  id: number;
  job: number;
  applicant_name: string;
  applicant_email: string;
  cover_letter: string;
  applied_at: string;
}

export interface NewJobInput {
  title: string;
  description: string;
  location: string;
  status: JobStatus;
}

export interface NewApplicationInput {
  job: number;
  applicant_name: string;
  applicant_email: string;
  cover_letter: string;
}

/** Shape of a DRF validation-error response: { field: ["message", ...] }. */
export type FieldErrors = Record<string, string[]>;
