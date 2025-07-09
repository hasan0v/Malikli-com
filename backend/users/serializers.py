# users/serializers.py
from rest_framework import serializers
from .models import User, Address
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions as django_exceptions

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'user', 'address_type', 'recipient_name', 'street_address',
            'address_line_2', 'city', 'state_province', 'postal_code',
            'country_code', 'phone_number', 'is_default_shipping', 'is_default_billing',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user'] # User will be set from the request context

class UserSerializer(serializers.ModelSerializer):
    addresses = AddressSerializer(many=True, read_only=True) # To display addresses when fetching user

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'is_verified', 'is_staff', 'is_active', 
            'date_joined', 'last_login', 'addresses'
        ]
        read_only_fields = ['is_staff', 'is_active', 'date_joined', 'last_login', 'is_verified']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name', 'phone_number')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone_number': {'required': False}
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    def validate_phone_number(self, value):
        """Custom validation for phone number to handle empty strings."""
        # Convert empty string to None for proper handling of unique constraint
        if value == '' or value is None:
            return None
        
        # Check if phone number already exists (only for non-empty values)
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Пользователь с таким номером телефона уже существует.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Пароли не совпадают."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')  # Remove password2 before creating user
        user = User.objects.create_user(**validated_data)
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Пароли не совпадают."})
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Пароли не совпадают."})
        return attrs

class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)