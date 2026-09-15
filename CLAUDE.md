# RBDC Ex 4 — Job Board

Minimal job board: employers post jobs, job seekers search and apply. Source
brief: `RBDC_Ex_4.pdf`. Project code has not been scaffolded yet — this file
describes the tech stack the brief specifies, to be followed once
implementation starts.

## Tech Stack

### Frontend
- **Next.js 14**
- Key components: `JobList` (list jobs), `JobForm` (employer posts a job),
  `ApplicationForm` (job seeker applies to a job)
- No frontend test requirement at this stage — focus on clean, modular
  components instead

### Backend
- **Django 5.1**
- Django's built-in `TestCase` (`django.test.TestCase`) for backend tests
- Core models:
  - `Job` — title, description, location, posting time
  - `Application` — applicant name, email, cover letter; linked to a `Job`
  - `Employer` — name, contact information
- Served via **Gunicorn** in production (`gunicorn myproject.wsgi:application`)

### Database
- **PostgreSQL 13**
- Core tables: `jobs`, `applications` (FK `applications.job_id → jobs.id`)

### Containerization
- **Docker** + **Docker Compose** — separate services for `backend` and
  `postgres` (frontend service to be added the same way)
- Backend image based on `python:3.9-slim`

### API Testing
- **Postman** for manual/exploratory API testing (e.g. `POST /api/jobs`)

### Deployment
- **Digital Ocean** for live deployment

## Practices

- **TDD**: red → green → refactor for all backend code
- **Backend coverage**: ≥70% with 100% of tests passing; cover models, views,
  and API endpoints
- **SRP**: each function/component does one thing
- **DRY**: no duplicated logic
- **Separation of concerns**: keep business logic, UI, and data access
  independent of each other

## Workflows the App Must Support

1. **Job posting** — employer submits title, description, location, status;
   persisted to PostgreSQL, retrievable by the frontend
2. **Application submission** — job seeker submits name, email, cover letter;
   stored against the relevant job, visible to the employer
3. **Search & filtering** — job seekers filter jobs by title and location via
   backend API endpoints

## Deliverables

- GitHub repo: backend at ≥70% coverage, 100% tests passing, modular (SRP/DRY)
- Docker Compose setup covering frontend, backend, and PostgreSQL
- Documentation: setup instructions, API docs, testing guidelines
- Live deployment on Digital Ocean
