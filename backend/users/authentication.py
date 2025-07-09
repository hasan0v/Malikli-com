"""
Custom authentication serializers and views that require email verification.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that checks if user is verified before allowing login.
    """
    
    def validate(self, attrs):
        # Get username and password
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user:
            # Check if user is verified
            if not user.is_verified:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        'Please verify your email address before logging in. '
                        'Check your email for the verification link.'
                    ],
                    'verification_required': True,
                    'email': user.email
                })
            
            # Check if user is active
            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': ['This account has been deactivated.']
                })
        
        # Continue with normal JWT validation
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that requires email verification.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            # Check if this is a verification error
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                if e.detail.get('verification_required'):
                    return Response({
                        'error': 'Email verification required',
                        'message': e.detail['non_field_errors'][0],
                        'verification_required': True,
                        'email': e.detail.get('email')
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # For other validation errors, return as usual
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
