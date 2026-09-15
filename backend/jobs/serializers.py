from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Application, Attachment, Employer, Job


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ['id', 'name', 'contact_email', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmployerRegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    contact_email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_contact_email(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value


class EmployerLoginSerializer(serializers.Serializer):
    contact_email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class JobSerializer(serializers.ModelSerializer):
    # Set server-side from the authenticated employer — never accepted from the client.
    applicant_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'employer', 'title', 'description', 'location', 'status', 'posted_at', 'applicant_count',
        ]
        read_only_fields = ['id', 'employer', 'posted_at', 'applicant_count']

    def get_applicant_count(self, obj):
        return obj.applications.count()


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'file', 'uploaded_at']
        read_only_fields = fields


class ApplicationSerializer(serializers.ModelSerializer):
    # Attachments are multiple files under one `attachments` form key; DRF's
    # ModelSerializer can't map that to this many-relation on write, so it's
    # handled directly in the view (request.FILES.getlist) and only rendered here.
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'applicant_name', 'applicant_email', 'description', 'attachments', 'applied_at',
        ]
        read_only_fields = ['id', 'applied_at', 'attachments']
