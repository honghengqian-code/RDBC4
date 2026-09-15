from django.contrib import admin

from .models import Application, Employer, Job

admin.site.register(Employer)
admin.site.register(Job)
admin.site.register(Application)
