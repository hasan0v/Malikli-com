# notifications_app/models.py
from django.db import models
from django.conf import settings # AUTH_USER_MODEL
from django.contrib.contenttypes.fields import GenericForeignKey # For generic relations
from django.contrib.contenttypes.models import ContentType      # For generic relations

class Notification(models.Model):
    # NOTIFICATION_TYPE_CHOICES could be defined here or managed more dynamically
    # For simplicity, we'll use a CharField for now.
    # Example types: 'drop_announcement', 'order_shipped', 'order_delivered', 'new_product_in_category'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    notification_type = models.CharField(max_length=50, db_index=True) # e.g., 'drop_announcement', 'order_update'

    # Generic relation to link to any model (e.g., a specific Drop, Order, Product)
    # This allows the notification to point to the relevant entity.
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True
    ) # The model type (e.g., Drop, Order)
    object_id = models.PositiveIntegerField(null=True, blank=True) # The PK of the instance
    related_object = GenericForeignKey('content_type', 'object_id') # The actual related object instance

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:50]}..."

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]