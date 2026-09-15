from unittest.mock import patch

from django.db import DatabaseError
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import Application, Job


class JobListCreateAPITest(APITestCase):
    url = '/api/jobs'

    def setUp(self):
        self.remote_job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )
        self.nyc_job = Job.objects.create(
            title='Product Designer', description='Design flows', location='New York',
        )

    def test_create_job_success(self):
        payload = {
            'title': 'Software Engineer',
            'description': 'Develop amazing features',
            'location': 'Remote',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Software Engineer')
        self.assertEqual(response.data['status'], 'open')
        self.assertEqual(Job.objects.count(), 3)

    def test_create_job_missing_required_fields_returns_400(self):
        response = self.client.post(self.url, {'title': 'Incomplete'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)
        self.assertIn('location', response.data)
        self.assertEqual(Job.objects.count(), 2)

    def test_create_job_database_error_returns_503(self):
        payload = {'title': 'X', 'description': 'Y', 'location': 'Z'}
        with patch('jobs.serializers.JobSerializer.save', side_effect=DatabaseError('down')):
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_list_jobs_returns_all(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_jobs_filters_by_title(self):
        response = self.client.get(self.url, {'title': 'Backend'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Backend Developer')

    def test_list_jobs_filters_by_location(self):
        response = self.client.get(self.url, {'location': 'New York'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['location'], 'New York')

    def test_list_jobs_search_with_no_matches_returns_empty_list(self):
        response = self.client.get(self.url, {'title': 'Nonexistent'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_list_jobs_database_error_returns_503(self):
        with patch('jobs.models.Job.objects.all', side_effect=DatabaseError('down')):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_list_jobs_logs_fetch(self):
        with self.assertLogs('jobs', level='INFO') as captured:
            self.client.get(self.url)
        self.assertTrue(any('Job list fetched' in message for message in captured.output))


class JobDetailAPITest(APITestCase):
    def setUp(self):
        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )

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
            'cover_letter': 'I would love this role.',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['applicant_name'], 'Jane Doe')
        self.assertEqual(Application.objects.count(), 1)
        self.assertEqual(Application.objects.first().job, self.job)

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
            'cover_letter': 'Cover letter text.',
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job', response.data)

    def test_submit_application_database_error_returns_503(self):
        payload = {
            'job': self.job.pk,
            'applicant_name': 'Jane Doe',
            'applicant_email': 'jane@example.com',
            'cover_letter': 'Cover letter text.',
        }
        with patch('jobs.serializers.ApplicationSerializer.save', side_effect=DatabaseError('down')):
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class JobApplicationsListAPITest(APITestCase):
    def setUp(self):
        self.job = Job.objects.create(
            title='Backend Developer', description='Build APIs', location='Remote',
        )
        self.other_job = Job.objects.create(
            title='Product Designer', description='Design flows', location='New York',
        )
        Application.objects.create(
            job=self.job, applicant_name='Jane Doe',
            applicant_email='jane@example.com', cover_letter='Cover letter.',
        )
        Application.objects.create(
            job=self.other_job, applicant_name='John Smith',
            applicant_email='john@example.com', cover_letter='Cover letter.',
        )

    def test_list_applications_for_job_returns_only_its_own(self):
        response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['applicant_name'], 'Jane Doe')

    def test_list_applications_for_missing_job_returns_404(self):
        response = self.client.get('/api/jobs/9999/applications')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_applications_database_error_returns_503(self):
        with patch('jobs.models.Application.objects.filter', side_effect=DatabaseError('down')):
            response = self.client.get(f'/api/jobs/{self.job.pk}/applications')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
