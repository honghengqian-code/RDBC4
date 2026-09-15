import logging

from django.db import DatabaseError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import MAX_ATTACHMENT_SIZE, Application, Attachment, Job
from .serializers import ApplicationSerializer, JobSerializer
from .tasks import send_application_received_email, send_new_applicant_email

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
def job_list_create(request):
    """List jobs (with optional title/location search) or create a new one."""
    if request.method == 'GET':
        title = request.query_params.get('title')
        location = request.query_params.get('location')
        try:
            jobs = Job.objects.all()
            if title:
                jobs = jobs.filter(title__icontains=title)
            if location:
                jobs = jobs.filter(location__icontains=location)
            jobs = jobs.order_by('-posted_at')
        except DatabaseError:
            logger.exception('Failed to fetch job list (title=%r, location=%r)', title, location)
            return Response(
                {'detail': 'Could not retrieve jobs at this time.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.info('Job list fetched: count=%s title=%r location=%r', jobs.count(), title, location)
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    # POST — only a signed-in employer may post a role, and it's always posted as them.
    if not request.user.is_authenticated or not hasattr(request.user, 'employer_profile'):
        logger.warning('Rejected job creation: no authenticated employer')
        return Response(
            {'detail': 'You must be signed in as an employer to post a role.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = JobSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning('Rejected job creation: invalid payload %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        serializer.save(employer=request.user.employer_profile)
    except DatabaseError:
        logger.exception('Database error while creating job with data=%s', request.data)
        return Response(
            {'detail': 'Could not create job at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def job_detail(request, job_id):
    try:
        job = Job.objects.filter(pk=job_id).first()
    except DatabaseError:
        logger.exception('Database error while fetching job id=%s', job_id)
        return Response(
            {'detail': 'Could not retrieve job at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if job is None:
        logger.info('Job not found: id=%s', job_id)
        return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(JobSerializer(job).data)


@api_view(['POST'])
def application_create(request):
    """Submit a job application, with zero or more attachments, for an existing job post."""
    attachments = request.FILES.getlist('attachments')
    oversized = [f.name for f in attachments if f.size > MAX_ATTACHMENT_SIZE]
    if oversized:
        logger.warning('Rejected application submission: oversized attachment(s) %s', oversized)
        return Response(
            {'attachments': [f'"{name}" exceeds the 5MB limit.' for name in oversized]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = ApplicationSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning('Rejected application submission: invalid payload %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            application = serializer.save()
            for file in attachments:
                Attachment.objects.create(application=application, file=file)
    except DatabaseError:
        logger.exception('Database error while creating application with data=%s', request.data)
        return Response(
            {'detail': 'Could not submit application at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    send_application_received_email.delay(application.id)
    send_new_applicant_email.delay(application.id)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def job_applications(request, job_id):
    """List applications received for a given job — visible only to the employer who posted it."""
    try:
        job = Job.objects.filter(pk=job_id).first()
    except DatabaseError:
        logger.exception('Database error while fetching job id=%s for applications view', job_id)
        return Response(
            {'detail': 'Could not retrieve applications at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if job is None:
        logger.info('Applications requested for missing job: id=%s', job_id)
        return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

    employer = getattr(request.user, 'employer_profile', None)
    if employer is None or job.employer_id != employer.id:
        logger.warning('Rejected applications view for job_id=%s: not the owning employer', job_id)
        return Response({'detail': 'You do not have access to this job.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        applications = Application.objects.filter(job_id=job_id).order_by('-applied_at')
    except DatabaseError:
        logger.exception('Database error while fetching applications for job_id=%s', job_id)
        return Response(
            {'detail': 'Could not retrieve applications at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    logger.info('Applications fetched for job_id=%s: count=%s', job_id, applications.count())
    return Response(ApplicationSerializer(applications, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employer_jobs(request):
    """List the roles posted by the signed-in employer (their dashboard)."""
    employer = getattr(request.user, 'employer_profile', None)
    if employer is None:
        return Response({'detail': 'Not an employer account.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        jobs = Job.objects.filter(employer=employer).order_by('-posted_at')
    except DatabaseError:
        logger.exception('Database error while fetching jobs for employer_id=%s', employer.id)
        return Response(
            {'detail': 'Could not retrieve your jobs at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    logger.info('Employer jobs fetched: employer_id=%s count=%s', employer.id, jobs.count())
    return Response(JobSerializer(jobs, many=True).data)
