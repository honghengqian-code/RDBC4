from django.urls import path

from . import views

urlpatterns = [
    path('jobs', views.job_list_create, name='job-list-create'),
    path('jobs/<int:job_id>', views.job_detail, name='job-detail'),
    path('jobs/<int:job_id>/applications', views.job_applications, name='job-applications'),
    path('applications', views.application_create, name='application-create'),
]
