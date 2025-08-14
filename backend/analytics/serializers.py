from rest_framework import serializers
from .models import WebsiteEvent


class WebsiteEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteEvent
        fields = ("event_type", "path", "session_id", "extra")

    def validate_event_type(self, value):
        if value not in {c[0] for c in WebsiteEvent.EVENT_TYPE_CHOICES}:
            raise serializers.ValidationError("Unsupported event type")
        return value
