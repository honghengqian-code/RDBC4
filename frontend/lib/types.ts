export type JobStatus = "open" | "closed";

export interface Job {
  id: number;
  employer: number | null;
  title: string;
  description: string;
  location: string;
  status: JobStatus;
  posted_at: string;
  applicant_count: number;
}

export interface Attachment {
  id: number;
  file: string;
  uploaded_at: string;
}

export interface Application {
  id: number;
  job: number;
  applicant_name: string;
  applicant_email: string;
  description: string;
  attachments: Attachment[];
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
  description: string;
  attachments?: File[];
}

/** Shape of a DRF validation-error response: { field: ["message", ...] }. */
export type FieldErrors = Record<string, string[]>;

/** Shape of a DRF PageNumberPagination response. */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Employer {
  id: number;
  name: string;
  contact_email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  employer: Employer;
}

export interface NewEmployerInput {
  name: string;
  contact_email: string;
  password: string;
}

export interface LoginInput {
  contact_email: string;
  password: string;
}
