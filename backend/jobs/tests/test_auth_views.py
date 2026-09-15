from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import DatabaseError, IntegrityError
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from jobs.models import Employer


class EmployerRegisterAPITest(APITestCase):
    url = '/api/auth/register'

    def test_register_success(self):
        payload = {'name': 'Acme Corp', 'contact_email': 'hr@acme.test', 'password': 'hunter2222'}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['employer']['name'], 'Acme Corp')
        self.assertEqual(Employer.objects.count(), 1)
        employer = Employer.objects.get()
        self.assertEqual(employer.user.username, 'hr@acme.test')
        self.assertTrue(Token.objects.filter(user=employer.user, key=response.data['token']).exists())

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter2222')
        payload = {'name': 'Acme Corp', 'contact_email': 'hr@acme.test', 'password': 'hunter2222'}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact_email', response.data)

    def test_register_rejects_short_password(self):
        payload = {'name': 'Acme Corp', 'contact_email': 'hr@acme.test', 'password': 'short'}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_register_missing_fields_returns_400(self):
        response = self.client.post(self.url, {'name': 'Acme Corp'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_database_error_returns_503(self):
        payload = {'name': 'Acme Corp', 'contact_email': 'hr@acme.test', 'password': 'hunter2222'}
        with patch('jobs.auth_views.Employer.objects.create', side_effect=IntegrityError('down')):
            response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(Employer.objects.count(), 0)


class EmployerLoginAPITest(APITestCase):
    url = '/api/auth/login'

    def setUp(self):
        self.user = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter2222')
        self.employer = Employer.objects.create(user=self.user, name='Acme Corp', contact_email='hr@acme.test')

    def test_login_success(self):
        response = self.client.post(
            self.url, {'contact_email': 'hr@acme.test', 'password': 'hunter2222'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['employer']['id'], self.employer.id)

    def test_login_wrong_password_returns_401(self):
        response = self.client.post(
            self.url, {'contact_email': 'hr@acme.test', 'password': 'wrong-password'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email_returns_401(self):
        response = self.client.post(
            self.url, {'contact_email': 'nobody@acme.test', 'password': 'hunter2222'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_for_user_without_employer_profile_returns_401(self):
        User.objects.create_user(username='plain@acme.test', email='plain@acme.test', password='hunter2222')
        response = self.client.post(
            self.url, {'contact_email': 'plain@acme.test', 'password': 'hunter2222'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields_returns_400(self):
        response = self.client.post(self.url, {'contact_email': 'hr@acme.test'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_database_error_returns_503(self):
        with patch('jobs.auth_views.Token.objects.get_or_create', side_effect=DatabaseError('down')):
            response = self.client.post(
                self.url, {'contact_email': 'hr@acme.test', 'password': 'hunter2222'}, format='json',
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class EmployerLogoutAPITest(APITestCase):
    url = '/api/auth/logout'

    def setUp(self):
        self.user = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter2222')
        Employer.objects.create(user=self.user, name='Acme Corp', contact_email='hr@acme.test')
        self.token = Token.objects.create(user=self.user)

    def test_logout_success_deletes_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_requires_authentication(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_database_error_returns_503(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        with patch('rest_framework.authtoken.models.Token.delete', side_effect=DatabaseError('down')):
            response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class EmployerMeAPITest(APITestCase):
    url = '/api/auth/me'

    def test_me_returns_employer_profile(self):
        user = User.objects.create_user(username='hr@acme.test', email='hr@acme.test', password='hunter2222')
        employer = Employer.objects.create(user=user, name='Acme Corp', contact_email='hr@acme.test')
        token = Token.objects.create(user=user)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], employer.id)

    def test_me_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_for_user_without_employer_profile_returns_403(self):
        user = User.objects.create_user(username='plain@acme.test', email='plain@acme.test', password='hunter2222')
        token = Token.objects.create(user=user)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
