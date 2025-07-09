from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    # username, email, first_name, last_name, password, is_staff, is_active, date_joined, last_login are inherited
    phone_number = models.CharField(_("phone number"), max_length=20, null=True, blank=True, unique=True)
    is_verified = models.BooleanField(_("verified"), default=False, help_text=_("Designates whether the user has verified their email address."))
    email_verification_token = models.CharField(_("email verification token"), max_length=255, unique=True, null=True, blank=True)
    password_reset_token = models.CharField(_("password reset token"), max_length=255, unique=True, null=True, blank=True)
    password_reset_expires = models.DateTimeField(_("password reset expires"), null=True, blank=True)
    # created_at is handled by date_joined from AbstractUser
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    # is_admin is handled by is_staff from AbstractUser

    # Add email to REQUIRED_FIELDS if it's not already (AbstractUser usually has it)
    # REQUIRED_FIELDS = ['email', 'first_name', 'last_name'] # Customize as needed

    def __str__(self):
        return self.username

ADDRESS_TYPE_CHOICES = [
    ('shipping', 'Shipping'),
    ('billing', 'Billing'),
]

class Address(models.Model):
    user = models.ForeignKey(User, related_name='addresses', on_delete=models.CASCADE, null=True, blank=True)  # Allow null for guest addresses
    address_type = models.CharField(max_length=50, choices=ADDRESS_TYPE_CHOICES)
    recipient_name = models.CharField(max_length=200)
    street_address = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country_code = models.CharField(max_length=2) # ISO 3166-1 alpha-2
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_default_shipping = models.BooleanField(default=False)
    is_default_billing = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.recipient_name} - {self.street_address}, {self.city}"

    class Meta:
        verbose_name_plural = "Addresses"
        # Ensure only one default shipping/billing address per user
        # This can be enforced with signals or model save overrides if complex logic is needed
        # unique_together = (('user', 'is_default_shipping'), ('user', 'is_default_billing')) # Be careful with this, might be too restrictive

WAITLIST_SOURCE_CHOICES = [
    ('waiting_page', 'Waiting Page'),
    ('website', 'Website'),
    ('social_media', 'Social Media'),
    ('email_campaign', 'Email Campaign'),
    ('referral', 'Referral'),
    ('advertisement', 'Advertisement'),
    ('influencer', 'Influencer'),
    ('newsletter', 'Newsletter'),
    ('other', 'Other'),
]
#  choices=WAITLIST_SOURCE_CHOICES,
class WaitlistSubscriber(models.Model):
    email = models.EmailField(_("email address"), unique=True)
    name = models.CharField(_("name"), max_length=255, blank=True, help_text=_("Full name of the subscriber"))
    first_name = models.CharField(_("first name"), max_length=150, blank=True, help_text=_("Extracted from name field"))
    last_name = models.CharField(_("last name"), max_length=150, blank=True, null=True, help_text=_("Extracted from name field"))
    phone_number = models.CharField(_("phone number"), max_length=20, blank=True, null=True)
    source = models.CharField(_("source"), max_length=50, default='waiting_page',choices=WAITLIST_SOURCE_CHOICES, help_text=_("How the subscriber found us"))
    is_processed = models.BooleanField(_("processed"), default=False, help_text=_("Whether this subscriber has been converted to a user"))
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    processed_at = models.DateTimeField(_("processed at"), null=True, blank=True)
    
    class Meta:
        verbose_name = _("Waitlist Subscriber")
        verbose_name_plural = _("Waitlist Subscribers")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name or self.email} ({self.get_source_display()})"
    
    def save(self, *args, **kwargs):
        """Extract first_name and last_name from name field if provided."""
        if self.name and not self.first_name:
            name_parts = self.name.strip().split()
            if name_parts:
                self.first_name = name_parts[0]
                if len(name_parts) > 1:
                    self.last_name = ' '.join(name_parts[1:])
        super().save(*args, **kwargs)
    
    def get_display_name(self):
        """Get the best display name for the subscriber."""
        if self.name:
            return self.name
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name or ''}".strip()
        return self.email.split('@')[0]

# In backend/settings.py, tell Django to use your custom User model:
# AUTH_USER_MODEL = 'users.User'