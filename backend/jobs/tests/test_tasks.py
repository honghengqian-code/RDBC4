from unittest.mock import patch

from django.core import mail
from django.test import TestCase

from jobs.models import Application, Employer, Job
from jobs.tasks import send_application_received_email, send_new_applicant_email


class SendApplicationReceivedEmailTest(TestCase):
    def setUp(self):
        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )
        self.application = Application.objects.create(
            job=self.job, applicant_name='Jane Doe',
            applicant_email='jane@example.com', description='I would love this role.',
        )

    def test_sends_confirmation_to_applicant(self):
        send_application_received_email(self.application.id)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.to, ['jane@example.com'])
        self.assertIn('Backend Developer', sent.subject)

    def test_missing_application_is_a_noop(self):
        send_application_received_email(9999)

        self.assertEqual(len(mail.outbox), 0)

    def test_smtp_failure_is_logged_not_raised(self):
        with patch('jobs.tasks.send_mail', side_effect=OSError('smtp down')):
            send_application_received_email(self.application.id)  # should not raise

        self.assertEqual(len(mail.outbox), 0)


class SendNewApplicantEmailTest(TestCase):
    def setUp(self):
        self.employer = Employer.objects.create(name='Acme Corp', contact_email='hr@acme.test')
        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
            employer=self.employer,
        )
        self.application = Application.objects.create(
            job=self.job, applicant_name='Jane Doe',
            applicant_email='jane@example.com', description='I would love this role.',
        )

    def test_sends_notification_to_employer(self):
        send_new_applicant_email(self.application.id)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.to, ['hr@acme.test'])
        self.assertIn('Jane Doe', sent.subject)

    def test_missing_application_is_a_noop(self):
        send_new_applicant_email(9999)

        self.assertEqual(len(mail.outbox), 0)

    def test_job_without_employer_is_a_noop(self):
        orphan_job = Job.objects.create(title='Design Intern', description='Assist', location='Remote')
        application = Application.objects.create(
            job=orphan_job, applicant_name='Sam Lee',
            applicant_email='sam@example.com', description='Interested!',
        )

        send_new_applicant_email(application.id)

        self.assertEqual(len(mail.outbox), 0)

    def test_smtp_failure_is_logged_not_raised(self):
        with patch('jobs.tasks.send_mail', side_effect=OSError('smtp down')):
            send_new_applicant_email(self.application.id)  # should not raise

        self.assertEqual(len(mail.outbox), 0)
