from django.db import models
from django.conf import settings


class WebsiteEvent(models.Model):
    """Generic website event for lightweight tracking (initially clicks)."""
    EVENT_TYPE_CHOICES = [
        ("click", "Click"),
    ]

    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, db_index=True)
    path = models.CharField(max_length=512, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='website_events')
    session_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    user_agent = models.CharField(max_length=255, blank=True, null=True)
    extra = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["path", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):  # pragma: no cover - simple repr
        return f"{self.event_type} {self.path} @ {self.created_at}"[:120]
