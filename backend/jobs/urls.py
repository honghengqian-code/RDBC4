from django.urls import path

from . import auth_views, views

urlpatterns = [
    path('jobs', views.job_list_create, name='job-list-create'),
    path('jobs/<int:job_id>', views.job_detail, name='job-detail'),
    path('jobs/<int:job_id>/applications', views.job_applications, name='job-applications'),
    path('applications', views.application_create, name='application-create'),
    path('applications/<int:application_id>', views.application_detail, name='application-detail'),
    path('employer/jobs', views.employer_jobs, name='employer-jobs'),
    path('auth/register', auth_views.employer_register, name='employer-register'),
    path('auth/login', auth_views.employer_login, name='employer-login'),
    path('auth/logout', auth_views.employer_logout, name='employer-logout'),
    path('auth/me', auth_views.employer_me, name='employer-me'),
]
