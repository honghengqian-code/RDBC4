from rest_framework import serializers

from .models import Application, Employer, Job


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ['id', 'name', 'contact_email', 'created_at']
        read_only_fields = ['id', 'created_at']


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = [
            'id', 'employer', 'title', 'description', 'location', 'status', 'posted_at',
        ]
        read_only_fields = ['id', 'posted_at']


class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = [
            'id', 'job', 'applicant_name', 'applicant_email', 'cover_letter', 'applied_at',
        ]
        read_only_fields = ['id', 'applied_at']
