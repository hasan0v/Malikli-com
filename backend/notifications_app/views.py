# notifications_app/views.py
from rest_framework import viewsets, mixins, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin, # Optional: if you want to get a single notification by ID
                          # mixins.UpdateModelMixin, # For marking as read/unread
                          viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(user=self.request.user).select_related('content_type')

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        notification = self.get_object() # Gets notification by pk, ensures it belongs to user via get_queryset
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-as-unread')
    def mark_as_unread(self, request, pk=None):
        notification = self.get_object()
        if notification.is_read:
            notification.is_read = False
            notification.read_at = None
            notification.save(update_fields=['is_read', 'read_at'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        updated_count = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'message': f'{updated_count} notifications marked as read.'})

# Helper function to create notifications (can be called from other parts of your app)
# For example, from signals or directly in other views.
def create_notification(user, message, notification_type, related_object=None):
    from django.contrib.contenttypes.models import ContentType
    content_type = None
    object_id = None
    if related_object:
        content_type = ContentType.objects.get_for_model(related_object)
        object_id = related_object.pk

    Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        content_type=content_type,
        object_id=object_id
    )
    # Here you might also want to send a push notification if using a service like Firebase (FCM)