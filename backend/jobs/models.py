import logging

from django.db import DatabaseError, models

logger = logging.getLogger(__name__)


class Employer(models.Model):
    name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Job(models.Model):
    employer = models.ForeignKey(
        Employer, on_delete=models.CASCADE, related_name='jobs',
        null=True, blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=[('open', 'Open'), ('closed', 'Closed')],
        default='open',
    )
    posted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.title} ({self.location})'

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        try:
            super().save(*args, **kwargs)
        except DatabaseError:
            logger.exception('Failed to save job "%s"', self.title)
            raise
        else:
            if is_new:
                logger.info('Job created: id=%s title=%r location=%r', self.pk, self.title, self.location)
            else:
                logger.info('Job updated: id=%s title=%r', self.pk, self.title)


class Application(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()
    cover_letter = models.TextField()
    applied_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.applicant_name} -> {self.job.title}'

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        try:
            super().save(*args, **kwargs)
        except DatabaseError:
            logger.exception(
                'Failed to save application from %r for job_id=%s', self.applicant_email, self.job_id,
            )
            raise
        else:
            if is_new:
                logger.info(
                    'Application submitted: id=%s applicant=%r job_id=%s',
                    self.pk, self.applicant_email, self.job_id,
                )
