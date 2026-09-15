from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import DatabaseError
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from jobs.models import Application, Attachment, Employer, Job


class JobListCreateAPITest(APITestCase):
    url = '/api/jobs'

    def setUp(self):
        self.remote_job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )
        self.nyc_job = Job.objects.create(
            title='Product Designer', description='Design flows', location='New York',
        )

        user = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter22')
        self.employer = Employer.objects.create(user=user, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=user)

    def authed(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_create_job_success(self):
        self.authed()
        payload = {
            'title': 'Software Engineer',
            'description': 'Develop amazing features',
            'location': 'Remote',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Software Engineer')
        self.assertEqual(response.data['status'], 'open')
        self.assertEqual(response.data['employer'], self.employer.id)
        self.assertEqual(Job.objects.count(), 3)

    def test_create_job_ignores_client_supplied_employer(self):
        other_user = User.objects.create_user(username='x@x.test', email='x@x.test', password='hunter22')
        other_employer = Employer.objects.create(user=other_user, name='Other Co', contact_email='x@x.test')
        self.authed()
        payload = {
            'title': 'Software Engineer', 'description': 'Develop', 'location': 'Remote',
            'employer': other_employer.id,
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['employer'], self.employer.id)

    def test_create_job_requires_authentication(self):
        payload = {'title': 'Software Engineer', 'description': 'Develop', 'location': 'Remote'}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Job.objects.count(), 2)

    def test_create_job_missing_required_fields_returns_400(self):
        self.authed()
        response = self.client.post(self.url, {'title': 'Incomplete'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)
        self.assertIn('location', response.data)
        self.assertEqual(Job.objects.count(), 2)

    def test_create_job_database_error_returns_503(self):
        self.authed()
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z'}
        with patch('jobs.serializers.JobSerializer.save', side_effect=DatabaseError('down')):
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_list_jobs_returns_all(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)

    def test_list_jobs_filters_by_title(self):
        response = self.client.get(self.url, {'title': 'Backend'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Backend Developer')

    def test_list_jobs_filters_by_location(self):
        response = self.client.get(self.url, {'location': 'New York'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['location'], 'New York')

    def test_list_jobs_filters_by_company(self):
        employer = Employer.objects.create(name='Acme Corp', contact_email='hr@acme.test')
        self.nyc_job.employer = employer
        self.nyc_job.save()

        response = self.client.get(self.url, {'company': 'Acme'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Product Designer')

    def test_list_jobs_filters_by_status(self):
        Job.objects.filter(pk=self.nyc_job.pk).update(status='closed')
        response = self.client.get(self.url, {'status': 'closed'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Product Designer')

    def test_list_jobs_search_with_no_matches_returns_empty_list(self):
        response = self.client.get(self.url, {'title': 'Nonexistent'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_list_jobs_database_error_returns_503(self):
        with patch('jobs.models.Job.objects.all', side_effect=DatabaseError('down')):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_list_jobs_is_paginated(self):
        for i in range(15):
            Job.objects.create(title=f'Extra Job {i}', description='D', location='Remote')

        first_page = self.client.get(self.url)
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(first_page.data['count'], 17)
        self.assertEqual(len(first_page.data['results']), 10)
        self.assertIsNotNone(first_page.data['next'])
        self.assertIsNone(first_page.data['previous'])

        second_page = self.client.get(self.url, {'page': 2})
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page.data['results']), 7)
        self.assertIsNone(second_page.data['next'])
        self.assertIsNotNone(second_page.data['previous'])

    def test_list_jobs_logs_fetch(self):
        with self.assertLogs('jobs', level='INFO') as captured:
            self.client.get(self.url)
        self.assertTrue(any('Job list fetched' in message for message in captured.output))


class JobDetailAPITest(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter22')
        self.employer = Employer.objects.create(user=owner, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=owner)

        other_owner = User.objects.create_user(username='x@x.test', email='x@x.test', password='hunter22')
        Employer.objects.create(user=other_owner, name='Other Co', contact_email='x@x.test')
        self.other_token = Token.objects.create(user=other_owner)

        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote', employer=self.employer,
        )

    def authed(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_get_existing_job_returns_200(self):
        response = self.client.get(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Backend Developer')

    def test_get_missing_job_returns_404(self):
        response = self.client.get('/api/jobs/9999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_job_database_error_returns_503(self):
        with patch('jobs.models.Job.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_owner_can_update_job(self):
        self.authed(self.token)
        payload = {'title': 'Senior Backend Developer', 'description': 'Build APIs', 'location': 'Remote', 'status': 'closed'}
        response = self.client.put(f'/api/jobs/{self.job.pk}', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Senior Backend Developer')
        self.assertEqual(response.data['status'], 'closed')
        self.job.refresh_from_db()
        self.assertEqual(self.job.title, 'Senior Backend Developer')
        self.assertEqual(self.job.status, 'closed')

    def test_update_requires_authentication(self):
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z', 'status': 'open'}
        response = self.client.put(f'/api/jobs/{self.job.pk}', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_rejects_non_owning_employer(self):
        self.authed(self.other_token)
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z', 'status': 'open'}
        response = self.client.put(f'/api/jobs/{self.job.pk}', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_missing_job_returns_404(self):
        self.authed(self.token)
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z', 'status': 'open'}
        response = self.client.put('/api/jobs/9999', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_invalid_payload_returns_400(self):
        self.authed(self.token)
        response = self.client.put(f'/api/jobs/{self.job.pk}', {'title': 'Incomplete'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_ignores_client_supplied_employer(self):
        other_user = User.objects.create_user(username='y@y.test', email='y@y.test', password='hunter22')
        other_employer = Employer.objects.create(user=other_user, name='Sneaky Co', contact_email='y@y.test')
        self.authed(self.token)
        payload = {
            'title': 'Backend Developer', 'description': 'Build APIs', 'location': 'Remote', 'status': 'open',
            'employer': other_employer.id,
        }
        response = self.client.put(f'/api/jobs/{self.job.pk}', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['employer'], self.employer.id)

    def test_update_database_error_returns_503(self):
        self.authed(self.token)
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z', 'status': 'open'}
        with patch('jobs.serializers.JobSerializer.save', side_effect=DatabaseError('down')):
            response = self.client.put(f'/api/jobs/{self.job.pk}', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_owner_can_delete_job(self):
        self.authed(self.token)
        response = self.client.delete(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Job.objects.filter(pk=self.job.pk).exists())

    def test_delete_requires_authentication(self):
        response = self.client.delete(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Job.objects.filter(pk=self.job.pk).exists())

    def test_delete_rejects_non_owning_employer(self):
        self.authed(self.other_token)
        response = self.client.delete(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Job.objects.filter(pk=self.job.pk).exists())

    def test_delete_missing_job_returns_404(self):
        self.authed(self.token)
        response = self.client.delete('/api/jobs/9999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_database_error_returns_503(self):
        self.authed(self.token)
        with patch('jobs.models.Job.delete', side_effect=DatabaseError('down')):
            response = self.client.delete(f'/api/jobs/{self.job.pk}')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class ApplicationCreateAPITest(APITestCase):
    url = '/api/applications'

    def setUp(self):
        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )

    def test_submit_application_success(self):
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'I would love this role.',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['applicant_name'], 'Jane Doe')
        self.assertEqual(Application.objects.count(), 1)
        self.assertEqual(Application.objects.first().job, self.job)
        self.assertEqual(response.data['attachments'], [])

    def test_submit_application_emails_the_applicant_a_confirmation(self):
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'I would love this role.',
        }
        self.client.post(self.url, payload, format='json')

        # No employer on file for self.job, so only the applicant is emailed.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['jane@example.com'])

    def test_submit_application_also_notifies_the_employer_when_one_is_on_file(self):
        employer = Employer.objects.create(name='Acme Corp', contact_email='hr@acme.test')
        staffed_job = Job.objects.create(
            title='Product Designer', description='Design flows', location='NYC', employer=employer,
        )
        payload = {
            'job': staffed_job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'I would love this role.',
        }
        self.client.post(self.url, payload, format='json')

        self.assertEqual(len(mail.outbox), 2)
        recipients = {recipient for sent in mail.outbox for recipient in sent.to}
        self.assertEqual(recipients, {'jane@example.com', 'hr@acme.test'})

    def test_submit_application_with_one_attachment_success(self):
        resume = SimpleUploadedFile('resume.pdf', b'%PDF-1.4 fake resume contents', content_type='application/pdf')
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'Please see attached resume.',
            'attachments': [resume],
        }
        response = self.client.post(self.url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application = Application.objects.get(pk=response.data['id'])
        self.assertEqual(application.attachments.count(), 1)
        self.assertEqual(len(response.data['attachments']), 1)
        for attachment in application.attachments.all():
            attachment.file.delete(save=False)

    def test_submit_application_with_multiple_attachments_success(self):
        resume = SimpleUploadedFile('resume.pdf', b'%PDF-1.4 resume', content_type='application/pdf')
        portfolio = SimpleUploadedFile('portfolio.pdf', b'%PDF-1.4 portfolio', content_type='application/pdf')
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'Please see attached files.',
            'attachments': [resume, portfolio],
        }
        response = self.client.post(self.url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application = Application.objects.get(pk=response.data['id'])
        self.assertEqual(application.attachments.count(), 2)
        self.assertEqual(len(response.data['attachments']), 2)
        for attachment in application.attachments.all():
            attachment.file.delete(save=False)

    def test_submit_application_rejects_oversized_attachment(self):
        ok_file = SimpleUploadedFile('resume.pdf', b'small', content_type='application/pdf')
        oversized = SimpleUploadedFile('big.pdf', b'x' * (5 * 1024 * 1024 + 1), content_type='application/pdf')
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'Please see attached resume.',
            'attachments': [ok_file, oversized],
        }
        response = self.client.post(self.url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('attachments', response.data)
        self.assertEqual(Application.objects.count(), 0)
        self.assertEqual(Attachment.objects.count(), 0)

    def test_submit_application_missing_fields_returns_400(self):
        response = self.client.post(self.url, {'applicant_name': 'Jane Doe'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job', response.data)
        self.assertEqual(Application.objects.count(), 0)

    def test_submit_application_for_nonexistent_job_returns_400(self):
        payload = {
            'job': 9999,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'Application description.',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job', response.data)

    def test_submit_application_database_error_returns_503(self):
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'description': 'Application description.',
        }
        with patch('jobs.serializers.ApplicationSerializer.save', side_effect=DatabaseError('down')):
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class JobApplicationsListAPITest(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter22')
        self.employer = Employer.objects.create(user=owner, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=owner)

        other_owner = User.objects.create_user(username='x@x.test', email='x@x.test', password='hunter22')
        other_employer = Employer.objects.create(user=other_owner, name='Other Co', contact_email='x@x.test')
        self.other_token = Token.objects.create(user=other_owner)

        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote', employer=self.employer,
        )
        self.other_job = Job.objects.create(
            title='Product Designer', description='Design flows', location='New York', employer=other_employer,
        )
        Application.objects.create(
            job=self.job, applicant_name='Jane Doe',
            applicant_email='jane@example.com', description='Application description.',
        )
        Application.objects.create(
            job=self.other_job, applicant_name='John Smith',
            applicant_email='john@example.com', description='Application description.',
        )

    def authed(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_list_applications_for_job_returns_only_its_own(self):
        self.authed(self.token)
        response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['applicant_name'], 'Jane Doe')

    def test_list_applications_requires_authentication(self):
        response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_applications_rejects_non_owning_employer(self):
        self.authed(self.other_token)
        response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_applications_for_missing_job_returns_404(self):
        self.authed(self.token)
        response = self.client.get('/api/jobs/9999/applications')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_applications_job_lookup_database_error_returns_503(self):
        self.authed(self.token)
        with patch('jobs.models.Job.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_list_applications_database_error_returns_503(self):
        self.authed(self.token)
        with patch('jobs.models.Application.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class EmployerJobsAPITest(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter22')
        self.employer = Employer.objects.create(user=owner, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=owner)

        other_owner = User.objects.create_user(username='x@x.test', email='x@x.test', password='hunter22')
        other_employer = Employer.objects.create(user=other_owner, name='Other Co', contact_email='x@x.test')

        Job.objects.create(title='Backend Developer', description='Build APIs', location='Remote', employer=self.employer)
        Job.objects.create(title='Product Designer', description='Design flows', location='NYC', employer=other_employer)

    def test_lists_only_own_jobs(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.get('/api/employer/jobs')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Backend Developer')

    def test_lists_own_jobs_paginated(self):
        for i in range(12):
            Job.objects.create(title=f'Extra {i}', description='D', location='Remote', employer=self.employer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        response = self.client.get('/api/employer/jobs')

        self.assertEqual(response.data['count'], 13)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_requires_authentication(self):
        response = self.client.get('/api/employer/jobs')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejects_user_without_employer_profile(self):
        plain_user = User.objects.create_user(username='plain@x.test', email='plain@x.test', password='hunter22')
        plain_token = Token.objects.create(user=plain_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {plain_token.key}')

        response = self.client.get('/api/employer/jobs')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_database_error_returns_503(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        with patch('jobs.models.Job.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get('/api/employer/jobs')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class ApplicationDetailAPITest(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter22')
        self.employer = Employer.objects.create(user=owner, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=owner)

        other_owner = User.objects.create_user(username='x@x.test', email='x@x.test', password='hunter22')
        Employer.objects.create(user=other_owner, name='Other Co', contact_email='x@x.test')
        self.other_token = Token.objects.create(user=other_owner)

        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote', employer=self.employer,
        )
        self.application = Application.objects.create(
            job=self.job, applicant_name='Jane Doe',
            applicant_email='jane@example.com', description='Application description.',
        )

    def authed(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_owner_can_view_application_detail(self):
        self.authed(self.token)
        response = self.client.get(f'/api/applications/{self.application.pk}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['applicant_name'], 'Jane Doe')
        self.assertEqual(response.data['description'], 'Application description.')

    def test_requires_authentication(self):
        response = self.client.get(f'/api/applications/{self.application.pk}')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejects_non_owning_employer(self):
        self.authed(self.other_token)
        response = self.client.get(f'/api/applications/{self.application.pk}')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_application_returns_404(self):
        self.authed(self.token)
        response = self.client.get('/api/applications/9999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_database_error_returns_503(self):
        self.authed(self.token)
        with patch('jobs.models.Application.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get(f'/api/applications/{self.application.pk}')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
