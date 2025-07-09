# users/views.py
from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

from .models import User, Address
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    AddressSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    EmailVerificationSerializer
)
from .email_utils import send_verification_email, send_password_reset_email

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        
        # Generate verification token and send email
        token = str(uuid.uuid4())
        user.email_verification_token = token
        user.save()
        
        # Send verification email using email utility
        try:
            success = send_verification_email(user)
            if success:
                logger.info(f"Verification email sent to {user.email}")
            else:
                logger.error(f"Failed to send verification email to {user.email}")
        except Exception as e:
            # Log the error but don't fail registration
            logger.error(f"Exception sending verification email to {user.email}: {e}")

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user # Get the currently authenticated user

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        # Users can only see and manage their own addresses
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user for the new address
        serializer.save(user=self.request.user)

class GuestAddressViewSet(generics.CreateAPIView):
    """
    Create temporary addresses for guest checkout.
    These addresses are not associated with any user.
    """
    serializer_class = AddressSerializer
    permission_classes = (AllowAny,)

    def perform_create(self, serializer):
        # Save address without associating it with any user (guest address)
        serializer.save(user=None)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            # Generate password reset token
            token = str(uuid.uuid4())
            user.password_reset_token = token
            user.password_reset_expires = timezone.now() + timedelta(hours=1)
            user.save()
            
            # Send password reset email using email utility
            try:
                success = send_password_reset_email(user)
                if success:
                    logger.info(f"Password reset email sent to {user.email}")
                else:
                    logger.error(f"Failed to send password reset email to {user.email}")
            except Exception as e:
                logger.error(f"Exception sending password reset email: {e}")
            
            return Response({'message': 'Письмо для сброса пароля отправлено'}, 
                          status=status.HTTP_200_OK)
        except User.DoesNotExist:
            # Return success even if user doesn't exist (security best practice)
            return Response({'message': 'Письмо для сброса пароля отправлено'}, 
                          status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(
                password_reset_token=token,
                password_reset_expires__gt=timezone.now()
            )
            user.set_password(password)
            user.password_reset_token = None
            user.password_reset_expires = None
            user.save()
            
            return Response({'message': 'Пароль успешно изменен'}, 
                          status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Недействительный или истекший токен'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'old_password': 'Неверный текущий пароль'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'message': 'Пароль успешно изменен'}, 
                          status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_email_view(request):
    serializer = EmailVerificationSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                return Response({'message': 'Email уже подтвержден'}, 
                              status=status.HTTP_200_OK)
            
            # Generate verification token
            token = str(uuid.uuid4())
            user.email_verification_token = token
            user.save()
            
            # Send verification email using email utility
            try:
                success = send_verification_email(user)
                if success:
                    logger.info(f"Verification email sent to {user.email}")
                    return Response({'message': 'Письмо для подтверждения email отправлено'}, 
                                  status=status.HTTP_200_OK)
                else:
                    logger.error(f"Failed to send verification email to {user.email}")
                    return Response({'error': 'Ошибка отправки email'}, 
                                  status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.error(f"Exception sending verification email: {e}")
                return Response({'error': 'Ошибка отправки email'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except User.DoesNotExist:
            return Response({'error': 'Пользователь с таким email не найден'}, 
                          status=status.HTTP_404_NOT_FOUND)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Токен обязателен'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email_verification_token=token)
        user.is_verified = True
        user.email_verification_token = None
        user.save()
        
        return Response({'message': 'Email успешно подтвержден'}, 
                      status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'Недействительный токен верификации'}, 
                      status=status.HTTP_400_BAD_REQUEST)