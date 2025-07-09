from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Language
from .serializers import LanguageSerializer

class LanguageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for retrieving available languages
    """
    queryset = Language.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer_class = LanguageSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get only active languages
        """
        languages = Language.objects.filter(is_active=True).order_by('display_order', 'name')
        serializer = self.get_serializer(languages, many=True)
        return Response(serializer.data)
