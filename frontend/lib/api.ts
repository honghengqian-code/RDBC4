import { logger } from "./logger";
import type {
  Application,
  AuthResponse,
  Employer,
  FieldErrors,
  Job,
  LoginInput,
  NewApplicationInput,
  NewEmployerInput,
  NewJobInput,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api";

/** Origin the API is served from, without the `/api` suffix — attachment `file` paths are relative to this. */
export const MEDIA_BASE_URL = API_URL.replace(/\/api\/?$/, "");

/** Thrown for a well-formed 4xx response; carries DRF's field-level errors. */
export class ValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors) {
    super("Validation failed");
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/** Thrown for network failures or non-2xx/4xx responses (5xx, unreachable API, etc). */
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Let the browser set its own multipart boundary for FormData bodies —
  // an explicit Content-Type here would omit it and the server couldn't parse the body.
  const isFormData = init?.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    logger.error(`Network error calling ${path}`, error);
    throw new ApiError("Could not reach the server. Is the backend running?");
  }

  if (response.status === 400) {
    const fieldErrors = (await response.json()) as FieldErrors;
    logger.warn(`Validation error from ${path}`, fieldErrors);
    throw new ValidationError(fieldErrors);
  }

  if (!response.ok) {
    let message = `Server error (${response.status}). Please try again shortly.`;
    try {
      const body = await response.json();
      if (body && typeof body.detail === "string") message = body.detail;
    } catch {
      // No JSON body to read a detail message from — keep the generic one.
    }
    logger.error(`Request to ${path} failed with status ${response.status}`, message);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Could not parse response from ${path}`, error);
    throw new ApiError("Received an unreadable response from the server.");
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Token ${token}` };
}

export interface JobSearchParams {
  title?: string;
  location?: string;
}

export async function getJobs(params: JobSearchParams = {}): Promise<Job[]> {
  const query = new URLSearchParams();
  if (params.title) query.set("title", params.title);
  if (params.location) query.set("location", params.location);
  const qs = query.toString();

  const jobs = await request<Job[]>(`/jobs${qs ? `?${qs}` : ""}`);
  logger.info(`Fetched ${jobs.length} job(s)`, params);
  return jobs;
}

export async function getJob(id: number): Promise<Job> {
  const job = await request<Job>(`/jobs/${id}`);
  logger.info(`Fetched job ${id}`);
  return job;
}

export async function createJob(input: NewJobInput, token: string): Promise<Job> {
  const job = await request<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(input),
    headers: authHeaders(token),
  });
  logger.info(`Created job ${job.id}: "${job.title}"`);
  return job;
}

export async function createApplication(input: NewApplicationInput): Promise<Application> {
  const formData = new FormData();
  formData.set("job", String(input.job));
  formData.set("applicant_name", input.applicant_name);
  formData.set("applicant_email", input.applicant_email);
  formData.set("description", input.description);
  for (const file of input.attachments ?? []) {
    formData.append("attachments", file);
  }

  const application = await request<Application>("/applications", {
    method: "POST",
    body: formData,
  });
  logger.info(`Submitted application ${application.id} for job ${application.job}`);
  return application;
}

export async function getJobApplications(jobId: number, token: string): Promise<Application[]> {
  const applications = await request<Application[]>(`/jobs/${jobId}/applications`, {
    headers: authHeaders(token),
  });
  logger.info(`Fetched ${applications.length} application(s) for job ${jobId}`);
  return applications;
}

export async function registerEmployer(input: NewEmployerInput): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  logger.info(`Employer registered: ${result.employer.id}`);
  return result;
}

export async function loginEmployer(input: LoginInput): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  logger.info(`Employer logged in: ${result.employer.id}`);
  return result;
}

export async function logoutEmployer(token: string): Promise<void> {
  await request<void>("/auth/logout", { method: "POST", headers: authHeaders(token) });
  logger.info("Employer logged out");
}

export async function getCurrentEmployer(token: string): Promise<Employer> {
  return request<Employer>("/auth/me", { headers: authHeaders(token) });
}

export async function getEmployerJobs(token: string): Promise<Job[]> {
  const jobs = await request<Job[]>("/employer/jobs", { headers: authHeaders(token) });
  logger.info(`Fetched ${jobs.length} of the employer's own job(s)`);
  return jobs;
}
