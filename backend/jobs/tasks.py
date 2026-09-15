import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task
def send_application_received_email(application_id):
    """Confirms receipt of an application to the applicant, by email."""
    from .models import Application

    application = Application.objects.filter(pk=application_id).select_related('job').first()
    if application is None:
        logger.warning('send_application_received_email: application_id=%s not found', application_id)
        return

    job = application.job
    try:
        send_mail(
            subject=f'Your application to "{job.title}" was received',
            message=(
                f'Hi {application.applicant_name},\n\n'
                f'This confirms we received your application for "{job.title}" ({job.location}).\n'
                f"We'll be in touch if there's a match.\n\n"
                f'— Noticeboard'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[application.applicant_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception(
            'Failed to send application-received email to %r for application_id=%s',
            application.applicant_email, application_id,
        )
    else:
        logger.info(
            'Application-received email sent to %r for application_id=%s',
            application.applicant_email, application_id,
        )


@shared_task
def send_new_applicant_email(application_id):
    """Notifies the hiring employer of a new applicant, if the job has one on file."""
    from .models import Application

    application = (
        Application.objects.filter(pk=application_id).select_related('job', 'job__employer').first()
    )
    if application is None:
        logger.warning('send_new_applicant_email: application_id=%s not found', application_id)
        return

    job = application.job
    employer = job.employer
    if employer is None or not employer.contact_email:
        logger.info('No employer contact on file for job_id=%s; skipping new-applicant email', job.id)
        return

    applicants_url = f'{settings.FRONTEND_URL}/jobs/{job.id}/applicants'
    try:
        send_mail(
            subject=f'New applicant for "{job.title}": {application.applicant_name}',
            message=(
                f'{application.applicant_name} ({application.applicant_email}) '
                f'just applied to "{job.title}".\n\n'
                f'{application.description}\n\n'
                f'Review all applicants: {applicants_url}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employer.contact_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception(
            'Failed to send new-applicant email to %r for application_id=%s',
            employer.contact_email, application_id,
        )
    else:
        logger.info(
            'New-applicant email sent to %r for application_id=%s',
            employer.contact_email, application_id,
        )
