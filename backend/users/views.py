# users/views.py
from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.db.models import Q
from django.http import HttpResponse
import csv, io, secrets
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

from .models import User, Address, WaitlistSubscriber
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    AddressSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    EmailVerificationSerializer,
    AdminUserSerializer
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

class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin management for users: list, retrieve, partial update.
    Supports filtering (?search=, ?is_active=, ?is_staff=) and ordering (?ordering=field or -field).
    Extra actions: bulk (POST admin-users/bulk/), export (GET admin-users/export/)."""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    # Include 'post' because we expose a custom bulk POST action
    http_method_names = ['get','patch','post','head','options']

    ORDERABLE_FIELDS = {'date_joined','last_login','username','email'}

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        for flag in ['is_active','is_staff']:
            val = self.request.query_params.get(flag)
            if val in ['true','false','1','0']:
                bool_val = val in ['true','1']
                qs = qs.filter(**{flag: bool_val})
        ordering = self.request.query_params.get('ordering')
        if ordering:
            field = ordering.lstrip('-')
            if field in self.ORDERABLE_FIELDS:
                qs = qs.order_by(ordering)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Append counts summary
        base_qs = self.filter_queryset(self.get_queryset())  # after filters
        summary = {
            'total': User.objects.count(),
            'active': User.objects.filter(is_active=True).count(),
            'inactive': User.objects.filter(is_active=False).count(),
            'staff': User.objects.filter(is_staff=True).count(),
            'verified': User.objects.filter(is_verified=True).count(),
            'unverified': User.objects.filter(is_verified=False).count(),
            'filtered_total': base_qs.count(),
        }
        response.data = { 'summary': summary, **response.data }
        return response

    def perform_update(self, serializer):
        # Prevent deactivating yourself accidentally (optional safety)
        instance = serializer.instance
        if 'is_active' in serializer.validated_data and instance.id == self.request.user.id:
            # allow re-activation but not self deactivation
            if serializer.validated_data['is_active'] is False:
                serializer.validated_data.pop('is_active')
        serializer.save()

    @staticmethod
    def _bulk_qs(ids):
        return User.objects.filter(id__in=ids)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_action(self, request):
        action = request.data.get('action')
        ids = request.data.get('ids') or []
        if not isinstance(ids, list) or not all(isinstance(i,int) for i in ids):
            return Response({'error':'ids must be list[int]'}, status=400)
        qs = self._bulk_qs(ids)
        updated = 0
        if action == 'activate':
            updated = qs.update(is_active=True)
        elif action == 'deactivate':
            # don't deactivate current user
            qs = qs.exclude(id=request.user.id)
            updated = qs.update(is_active=False)
        elif action == 'make_staff':
            updated = qs.update(is_staff=True)
        elif action == 'revoke_staff':
            qs = qs.exclude(id=request.user.id)
            updated = qs.update(is_staff=False)
        elif action == 'resend_verification':
            sent = 0
            for u in qs.filter(is_verified=False):
                try:
                    u.email_verification_token = str(uuid.uuid4())
                    u.save()
                    send_verification_email(u)
                    sent += 1
                except Exception:  # pragma: no cover
                    continue
            return Response({'sent': sent})
        else:
            return Response({'error':'Unknown action'}, status=400)
        return Response({'updated': updated})

    @action(detail=False, methods=['get'], url_path='export')
    def export_csv(self, request):
        qs = self.get_queryset()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id','username','email','first_name','last_name','is_active','is_staff','is_verified','date_joined','last_login'])
        for u in qs[:5000]:  # safety cap
            writer.writerow([u.id,u.username,u.email,u.first_name,u.last_name,u.is_active,u.is_staff,u.is_verified,u.date_joined.isoformat(),u.last_login.isoformat() if u.last_login else ''])
        resp = HttpResponse(output.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        return resp

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def convert_waitlist_subscriber(request):
    email = request.data.get('email')
    if not email:
        return Response({'error':'email required'}, status=400)
    try:
        sub = WaitlistSubscriber.objects.get(email=email, is_processed=False)
    except WaitlistSubscriber.DoesNotExist:
        return Response({'error':'subscriber not found or already processed'}, status=404)
    # Create user if not exists
    user, created = User.objects.get_or_create(email=email, defaults={
        'username': email.split('@')[0][:20] + secrets.token_hex(2),
        'first_name': sub.first_name or '',
        'last_name': sub.last_name or '',
        'is_active': True,
        'is_verified': True,
    })
    if created:
        password = secrets.token_urlsafe(12)
        user.set_password(password)
        user.save()
    sub.is_processed = True
    sub.processed_at = timezone.now()
    sub.save()
    return Response(AdminUserSerializer(user).data, status=201)

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