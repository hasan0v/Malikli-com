# notifications_app/serializers.py
from rest_framework import serializers
from .models import Notification
# Import other serializers if you want to embed related_object details
# from drops.serializers import DropSerializer # Example
# from orders.serializers import OrderSerializer # Example

class NotificationSerializer(serializers.ModelSerializer):
    # Optionally, serialize the related_object if you want to embed its details
    # This can get complex due to the generic nature.
    # For now, we'll just provide IDs and type. Frontend can fetch details if needed.
    related_object_type = serializers.CharField(source='content_type.model', read_only=True, allow_null=True)
    related_object_id = serializers.IntegerField(source='object_id', read_only=True, allow_null=True)

    # A more advanced way to serialize the related_object:
    # related_object_details = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'message', 'notification_type',
            'is_read', 'read_at', 'created_at',
            'related_object_type', 'related_object_id', # 'related_object_details'
        ]
        read_only_fields = ('user', 'created_at', 'read_at', 'related_object_type', 'related_object_id')


    # Example of how you might serialize the related_object dynamically:
    # def get_related_object_details(self, obj):
    #     if obj.related_object:
    #         if isinstance(obj.related_object, Drop): # Replace Drop with your actual model
    #             return DropSerializer(obj.related_object, context=self.context).data
    #         elif isinstance(obj.related_object, Order): # Replace Order
    #             return OrderSerializer(obj.related_object, context=self.context).data
    #         # Add more types as needed
    #     return None