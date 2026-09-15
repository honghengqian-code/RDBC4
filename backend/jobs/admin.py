from django.contrib import admin

from .models import Application, Attachment, Employer, Job


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0


class ApplicationAdmin(admin.ModelAdmin):
    inlines = [AttachmentInline]


admin.site.register(Employer)
admin.site.register(Job)
admin.site.register(Application, ApplicationAdmin)
