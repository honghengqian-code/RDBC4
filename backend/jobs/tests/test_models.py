from unittest.mock import patch

from django.db import DatabaseError
from django.test import TestCase

from jobs.models import Application, Employer, Job


class EmployerModelTest(TestCase):
    def setUp(self):
        self.employer = Employer.objects.create(
            name='Acme Corp',
            contact_email='hr@acme.test',
        )

    def test_employer_creation(self):
        self.assertEqual(self.employer.name, 'Acme Corp')
        self.assertEqual(self.employer.contact_email, 'hr@acme.test')
        self.assertIsNotNone(self.employer.created_at)

    def test_employer_str(self):
        self.assertEqual(str(self.employer), 'Acme Corp')


class JobModelTest(TestCase):
    def setUp(self):
        self.job = Job.objects.create(
            title='Frontend Developer',
            description='Build responsive UIs',
            location='Remote',
        )

    def test_job_creation(self):
        self.assertEqual(self.job.title, 'Frontend Developer')
        self.assertEqual(self.job.location, 'Remote')

    def test_job_default_status_is_open(self):
        self.assertEqual(self.job.status, 'open')

    def test_job_posted_at_is_set_automatically(self):
        self.assertIsNotNone(self.job.posted_at)

    def test_job_str(self):
        self.assertEqual(str(self.job), 'Frontend Developer (Remote)')

    def test_job_can_be_linked_to_employer(self):
        employer = Employer.objects.create(name='Acme Corp', contact_email='hr@acme.test')
        self.job.employer = employer
        self.job.save()
        self.job.refresh_from_db()
        self.assertEqual(self.job.employer, employer)

    def test_job_save_logs_info_on_success(self):
        with self.assertLogs('jobs', level='INFO') as captured:
            Job.objects.create(title='Backend Developer', description='Build APIs', location='Remote')
        self.assertTrue(any('Job created' in message for message in captured.output))

    def test_job_save_logs_and_reraises_on_database_error(self):
        job = Job(title='Broken Job', description='desc', location='Remote')
        with patch(
            'django.db.models.Model.save', side_effect=DatabaseError('connection lost'),
        ):
            with self.assertLogs('jobs', level='ERROR') as captured:
                with self.assertRaises(DatabaseError):
                    job.save()
        self.assertTrue(any('Failed to save job' in message for message in captured.output))


class ApplicationModelTest(TestCase):
    def setUp(self):
        self.job = Job.objects.create(
            title='Backend Developer',
            description='Build APIs',
            location='Remote',
        )
        self.application = Application.objects.create(
            job=self.job,
            applicant_name='Jane Doe',
            applicant_email='jane@example.com',
            cover_letter='I would love this role.',
        )

    def test_application_creation(self):
        self.assertEqual(self.application.applicant_name, 'Jane Doe')
        self.assertEqual(self.application.applicant_email, 'jane@example.com')
        self.assertEqual(self.application.job, self.job)

    def test_application_applied_at_is_set_automatically(self):
        self.assertIsNotNone(self.application.applied_at)

    def test_application_str(self):
        self.assertEqual(str(self.application), 'Jane Doe -> Backend Developer')

    def test_application_is_deleted_when_job_is_deleted(self):
        self.job.delete()
        self.assertEqual(Application.objects.count(), 0)

    def test_application_save_logs_info_on_success(self):
        with self.assertLogs('jobs', level='INFO') as captured:
            Application.objects.create(
                job=self.job,
                applicant_name='John Smith',
                applicant_email='john@example.com',
                cover_letter='Looking forward to this.',
            )
        self.assertTrue(any('Application submitted' in message for message in captured.output))

    def test_application_save_logs_and_reraises_on_database_error(self):
        application = Application(
            job=self.job,
            applicant_name='Broken Applicant',
            applicant_email='broken@example.com',
            cover_letter='desc',
        )
        with patch(
            'django.db.models.Model.save', side_effect=DatabaseError('connection lost'),
        ):
            with self.assertLogs('jobs', level='ERROR') as captured:
                with self.assertRaises(DatabaseError):
                    application.save()
        self.assertTrue(any('Failed to save application' in message for message in captured.output))
