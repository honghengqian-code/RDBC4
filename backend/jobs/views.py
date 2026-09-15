import logging

from django.db import DatabaseError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Application, Job
from .serializers import ApplicationSerializer, JobSerializer

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

    # POST
    serializer = JobSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning('Rejected job creation: invalid payload %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        serializer.save()
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
    """Submit a job application, associating it with an existing job post."""
    serializer = ApplicationSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning('Rejected application submission: invalid payload %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        serializer.save()
    except DatabaseError:
        logger.exception('Database error while creating application with data=%s', request.data)
        return Response(
            {'detail': 'Could not submit application at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def job_applications(request, job_id):
    """List applications received for a given job (employer view)."""
    try:
        if not Job.objects.filter(pk=job_id).exists():
            logger.info('Applications requested for missing job: id=%s', job_id)
            return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)
        applications = Application.objects.filter(job_id=job_id).order_by('-applied_at')
    except DatabaseError:
        logger.exception('Database error while fetching applications for job_id=%s', job_id)
        return Response(
            {'detail': 'Could not retrieve applications at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    logger.info('Applications fetched for job_id=%s: count=%s', job_id, applications.count())
    return Response(ApplicationSerializer(applications, many=True).data)
