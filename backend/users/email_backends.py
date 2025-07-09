"""
Custom email backend for Resend API integration.
This provides an alternative to SMTP for better deliverability and features.
"""
import resend
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage, EmailMultiAlternatives
import logging

logger = logging.getLogger(__name__)


class ResendAPIBackend(BaseEmailBackend):
    """
    Email backend that uses Resend's API instead of SMTP.
    This can provide better deliverability and additional features.
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'RESEND_API_KEY', None)
        if self.api_key:
            resend.api_key = self.api_key
        else:
            logger.warning("RESEND_API_KEY not configured. Email sending will fail.")
    
    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not self.api_key:
            logger.error("Resend API key not configured")
            if not self.fail_silently:
                raise ValueError("Resend API key not configured")
            return 0
        
        sent_count = 0
        for message in email_messages:
            try:
                if self._send_message(message):
                    sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email via Resend API: {e}")
                if not self.fail_silently:
                    raise
        
        return sent_count
    
    def _send_message(self, message):
        """Send a single email message using Resend API."""
        try:
            # Prepare email data
            email_data = {
                "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
                "to": message.to,
                "subject": message.subject,
            }
            
            # Add CC and BCC if present
            if message.cc:
                email_data["cc"] = message.cc
            if message.bcc:
                email_data["bcc"] = message.bcc
            
            # Handle different message types
            if isinstance(message, EmailMultiAlternatives):
                # Handle HTML emails
                html_content = None
                text_content = message.body
                
                for content, mimetype in message.alternatives:
                    if mimetype == 'text/html':
                        html_content = content
                        break
                
                if html_content:
                    email_data["html"] = html_content
                    email_data["text"] = text_content
                else:
                    email_data["text"] = text_content
            else:
                # Plain text email
                email_data["text"] = message.body
            
            # Add headers if present
            if hasattr(message, 'extra_headers') and message.extra_headers:
                headers = {}
                for key, value in message.extra_headers.items():
                    if key.lower() not in ['from', 'to', 'cc', 'bcc', 'subject']:
                        headers[key] = value
                if headers:
                    email_data["headers"] = headers
            
            # Send email via Resend API
            response = resend.Emails.send(email_data)
            
            if response and hasattr(response, 'id'):
                logger.info(f"Email sent successfully via Resend. ID: {response.id}")
                return True
            else:
                logger.error(f"Unexpected response from Resend API: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email via Resend API: {e}")
            if not self.fail_silently:
                raise
            return False
