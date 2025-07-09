from rest_framework import serializers
from .models import Language

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['code', 'name', 'native_name', 'is_rtl', 'flag_code', 'display_order']
