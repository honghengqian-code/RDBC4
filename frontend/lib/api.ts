import { logger } from "./logger";
import type {
  Application,
  FieldErrors,
  Job,
  NewApplicationInput,
  NewJobInput,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api";

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
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
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
    logger.error(`Request to ${path} failed with status ${response.status}`);
    throw new ApiError(`Server error (${response.status}). Please try again shortly.`, response.status);
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

export async function createJob(input: NewJobInput): Promise<Job> {
  const job = await request<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  logger.info(`Created job ${job.id}: "${job.title}"`);
  return job;
}

export async function createApplication(input: NewApplicationInput): Promise<Application> {
  const application = await request<Application>("/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
  logger.info(`Submitted application ${application.id} for job ${application.job}`);
  return application;
}

export async function getJobApplications(jobId: number): Promise<Application[]> {
  const applications = await request<Application[]>(`/jobs/${jobId}/applications`);
  logger.info(`Fetched ${applications.length} application(s) for job ${jobId}`);
  return applications;
}
