"""
Email utilities for sending templated emails using Resend or SMTP.
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_templated_email(subject, template_name, context, to_emails, from_email=None):
    """
    Send a templated email with both HTML and text versions.
    
    Args:
        subject (str): Email subject line
        template_name (str): Base template name (without extension)
        context (dict): Template context variables
        to_emails (list): List of recipient email addresses
        from_email (str): Sender email (optional)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if from_email is None:
        from_email = settings.DEFAULT_FROM_EMAIL
    
    try:
        # Render HTML template
        html_template = f'emails/{template_name}.html'
        html_content = render_to_string(html_template, context)
        
        # Render text template (fallback to stripped HTML if no text template)
        text_template = f'emails/{template_name}.txt'
        try:
            text_content = render_to_string(text_template, context)
        except:
            # Fallback to stripped HTML
            text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=to_emails
        )
        
        # Attach HTML alternative
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        
        logger.info(f"Email sent successfully to {to_emails}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_emails}: {e}")
        return False


def send_verification_email(user):
    """
    Send email verification email to user.
    
    Args:
        user: User instance with email_verification_token
    
    Returns:
        bool: True if email was sent successfully
    """
    if not user.email_verification_token:
        logger.warning(f"No verification token for user {user.email}")
        return False
    
    verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={user.email_verification_token}"
    
    context = {
        'user': user,
        'verification_url': verification_url,
        'site_name': 'Malikli1992',
        'expiry_hours': getattr(settings, 'EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS', 24)
    }
    
    return send_templated_email(
        subject='Verify Your Email Address - Malikli1992',
        template_name='verify_email',
        context=context,
        to_emails=[user.email]
    )


def send_password_reset_email(user):
    """
    Send password reset email to user.
    
    Args:
        user: User instance with password_reset_token
    
    Returns:
        bool: True if email was sent successfully
    """
    if not user.password_reset_token:
        logger.warning(f"No password reset token for user {user.email}")
        return False
    
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={user.password_reset_token}"
    
    context = {
        'user': user,
        'reset_url': reset_url,
        'site_name': 'Malikli1992',
        'expiry_hours': getattr(settings, 'PASSWORD_RESET_TOKEN_EXPIRY_HOURS', 1)
    }
    
    return send_templated_email(
        subject='Reset Your Password - Malikli1992',
        template_name='password_reset',
        context=context,
        to_emails=[user.email]
    )


def send_welcome_email(user):
    """
    Send welcome email to newly registered user.
    
    Args:
        user: User instance
    
    Returns:
        bool: True if email was sent successfully
    """
    context = {
        'user': user,
        'site_name': 'Malikli1992',
        'login_url': f"{settings.FRONTEND_URL}/auth/login"
    }
    
    return send_templated_email(
        subject='Welcome to Malikli1992!',
        template_name='welcome',
        context=context,
        to_emails=[user.email]
    )


def send_email_change_confirmation(user, new_email, token):
    """
    Send email change confirmation to new email address.
    
    Args:
        user: User instance
        new_email: New email address to confirm
        token: Confirmation token
    
    Returns:
        bool: True if email was sent successfully
    """
    confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm-email-change?token={token}"
    
    context = {
        'user': user,
        'new_email': new_email,
        'confirmation_url': confirmation_url,
        'site_name': 'Malikli1992'
    }
    
    return send_templated_email(
        subject='Confirm Your New Email Address - Malikli1992',
        template_name='email_change_confirmation',
        context=context,
        to_emails=[new_email]
    )


def send_order_confirmation_email(order, user_email=None):
    """
    Send order confirmation email to user or guest.
    
    Args:
        order: Order instance
        user_email: Email address for guest orders (optional if order has user)
    
    Returns:
        bool: True if email was sent successfully
    """
    # Determine recipient email
    if order.user:
        recipient_email = order.user.email
        user = order.user
    elif user_email:
        recipient_email = user_email
        user = None
    elif hasattr(order, 'email_for_guest') and order.email_for_guest:
        # Get email from order model if stored there
        recipient_email = order.email_for_guest
        user = None
    else:
        logger.warning(f"No email address available for order {order.order_number}")
        return False
    
    # Get contact email from settings
    contact_email = getattr(settings, 'CONTACT_EMAIL', 'support@malikli1992.com')
    
    context = {
        'order': order,
        'user': user,
        'items': order.items.all(),
        'site_name': 'Malikli1992',
        'contact_email': contact_email
    }
    
    return send_templated_email(
        subject=f'Order Received - {order.order_number} - Malikli1992',
        template_name='order_received',
        context=context,
        to_emails=[recipient_email]
    )
