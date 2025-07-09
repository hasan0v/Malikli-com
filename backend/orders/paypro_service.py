import requests
import base64
import json
import logging
from typing import Dict, Any, Tuple, Optional
from django.conf import settings
from decimal import Decimal
from .currency_service import currency_converter

logger = logging.getLogger(__name__)

class PayProService:
    """
    PayPro BPC Payment Gateway Service
    
    Implements PayPro BPC API v2 for creating payment tokens and processing payments.
    Based on official API documentation: https://checkout.paypro.by/ctp/api/checkouts
    """
    
    def __init__(self):
        try:
            self.shop_id = str(settings.PAYPRO_BPC_SHOP_ID)
            self.secret_key = settings.PAYPRO_BPC_SECRET_KEY
            self.checkout_url = getattr(settings, 'PAYPRO_BPC_CHECKOUT_URL', 'https://checkout.paypro.by')
            self.is_sandbox = getattr(settings, 'PAYPRO_BPC_SANDBOX', False)
            print(f"PayPro BPC Service initialized with  is_sandbox: {self.is_sandbox}")
        except AttributeError as e:
            logger.error(f"PayPro configuration missing: {e}")
            raise Exception(f"PayPro service not properly configured. Missing setting: {e}")
        
        if not self.shop_id or self.shop_id == 'your_shop_id_here':
            raise Exception("PAYPRO_BPC_SHOP_ID not configured")
        if not self.secret_key or self.secret_key == 'your_secret_key_here':
            raise Exception("PAYPRO_BPC_SECRET_KEY not configured")
        
    def _get_auth_header(self) -> str:
        """Create HTTP Basic Authentication header for PayPro BPC API"""
        credentials = f"{self.shop_id}:{self.secret_key}"
        encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        return f"Basic {encoded_credentials}"
    
    def _get_api_headers(self) -> Dict[str, str]:
        """Get required headers for PayPro BPC API v2"""
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Version': '2',  # Required for API v2
            'Authorization': self._get_auth_header()
        }
    
    def _get_return_urls(self) -> Dict[str, str]:
        """Get return URLs for PayPro redirect flow"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
        backend_url = getattr(settings, 'BACKEND_URL', 'https://malikli1992.com')
        
        return {
            "success_url": f"{backend_url}/api/v1/payment/success/",
            "decline_url": f"{backend_url}/api/v1/payment/declined/", 
            "fail_url": f"{backend_url}/api/v1/payment/failed/",
            "cancel_url": f"{backend_url}/api/v1/payment/cancelled/",
            "notification_url": f"{backend_url}/api/v1/webhooks/paypro/"
        }
    
    def _validate_order_data(self, order_data: Dict[str, Any]) -> None:
        """Validate required order data fields"""
        required_fields = ['order_id', 'amount', 'currency', 'customer_email']
        missing_fields = [field for field in required_fields if not order_data.get(field)]
        
        if missing_fields:
            raise ValueError(f"Missing required order data fields: {', '.join(missing_fields)}")
        
        # Validate amount
        try:
            amount = float(order_data['amount'])
            if amount <= 0:
                raise ValueError("Amount must be greater than 0")
        except (ValueError, TypeError):
            raise ValueError("Invalid amount format")
        
        # Validate currency
        if len(order_data['currency']) != 3:
            raise ValueError("Currency must be a 3-letter ISO-4217 code")
        
        # Validate email format (basic check)
        email = order_data['customer_email']
        if '@' not in email or '.' not in email:
            raise ValueError("Invalid email format")
    
    def create_payment_token(self, order_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a payment token using PayPro BPC API v2
        
        Args:
            order_data: Dictionary containing order information:
                - order_id: Unique order identifier
                - amount: Payment amount (will be converted to minimal currency units)
                - currency: 3-letter ISO-4217 currency code
                - customer_email: Customer's email address
                - customer_first_name: Customer's first name (optional)
                - customer_last_name: Customer's last name (optional)
                - description: Order description (optional)
                
        Returns:
            Tuple[bool, Dict]: (success, response_data)
            If successful, response_data contains:
                - token: Payment token
                - redirect_url: URL to redirect customer for payment
                - checkout_data: Full checkout response from PayPro
        """
        try:
            # Validate input data
            self._validate_order_data(order_data)
            
            # PayPro BPC API endpoint for creating payment tokens
            url = f"{self.checkout_url}/ctp/api/checkouts"
            
            # Get return URLs
            return_urls = self._get_return_urls()
            
            # Handle currency conversion
            original_amount = Decimal(str(order_data['amount']))
            original_currency = order_data['currency'].upper()
            
            # # Convert to BYN if needed (PayPro BPC only accepts BYN)
            # if original_currency == 'EUR':
            #     byn_amount = currency_converter.convert_eur_to_byn(original_amount)
            #     payment_currency = 'BYN'
            #     logger.info(f"Converting {original_amount} EUR to {byn_amount} BYN for PayPro payment")
            # elif original_currency == 'BYN':
            #     byn_amount = original_amount
            #     payment_currency = 'BYN'
            #     logger.info(f"Using BYN amount directly: {byn_amount} BYN")
            # else:
            #     # For other currencies, convert via EUR first (if needed)
            #     logger.warning(f"Unsupported currency {original_currency}, treating as EUR for conversion")
            #     byn_amount = currency_converter.convert_eur_to_byn(original_amount)
            #     payment_currency = 'BYN'
            
            # Use original currency and amount without conversion
            payment_amount = original_amount
            payment_currency = original_currency
            logger.info(f"Using original amount and currency: {payment_amount} {payment_currency}")
            
            # Convert amount to minimal currency units (cents for EUR, kopecks for BYN, etc.)
            if payment_currency in ['EUR', 'USD', 'BYN']:
                amount_minimal_units = int(payment_amount * Decimal('100'))
            else:
                # For other currencies, assume 100 subunits = 1 main unit
                amount_minimal_units = int(payment_amount * Decimal('100'))
            
            # Build PayPro BPC API v2 payload according to official documentation
            payload = {
                "checkout": {
                    "test": False,
                    "transaction_type": "payment",
                    "attempts": 3,  # Allow up to 3 payment attempts
                    "order": {
                        "amount": amount_minimal_units,
                        "currency": payment_currency,
                        "description": order_data.get('description', f"Payment for Order #{order_data['order_id']}"),
                        "tracking_id": str(order_data['order_id'])
                    },
                    "customer": {
                        "email": order_data['customer_email'],
                        "first_name": order_data.get('customer_first_name', ''),
                        "last_name": order_data.get('customer_last_name', '')
                    },
                    "settings": {
                        "success_url": return_urls['success_url'],
                        "decline_url": return_urls['decline_url'],
                        "fail_url": return_urls['fail_url'],
                        "cancel_url": return_urls['cancel_url'],
                        "notification_url": return_urls['notification_url'],
                        "language": order_data.get('language', 'en'),
                        "auto_return": 3,  # Show result page for 3 seconds then redirect
                        "customer_fields": {
                            "visible": ["first_name", "last_name"],
                            "read_only": ["email"]
                        }
                    },
                    "payment_method": {
                        "types": ["credit_card"]
                    }
                }
            }
            
            # Add optional fields if provided
            if order_data.get('receipt_text'):
                payload["checkout"]["order"]["additional_data"] = {
                    "receipt_text": order_data['receipt_text']
                }
            
            headers = self._get_api_headers()
            
            logger.info(f"Creating PayPro payment token for order {order_data['order_id']}")
            logger.debug(f"PayPro API URL: {url}")
            logger.debug(f"PayPro payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=30, verify=True)
            
            logger.info(f"PayPro response status: {response.status_code}")
            logger.debug(f"PayPro response headers: {dict(response.headers)}")
            
            if response.status_code in [200, 201]:
                response_data = response.json()
                logger.info(f"PayPro payment token created successfully")
                logger.debug(f"PayPro response: {json.dumps(response_data, indent=2)}")
                
                if 'checkout' in response_data:
                    checkout_data = response_data['checkout']
                    
                    # Validate required response fields
                    if not checkout_data.get('token'):
                        logger.error("PayPro response missing required 'token' field")
                        return False, {
                            'error_code': 'INVALID_RESPONSE',
                            'error_message': 'PayPro API response missing token'
                        }
                    
                    if not checkout_data.get('redirect_url'):
                        logger.error("PayPro response missing required 'redirect_url' field")
                        return False, {
                            'error_code': 'INVALID_RESPONSE', 
                            'error_message': 'PayPro API response missing redirect_url'
                        }
                    
                    session_data = {
                        'token': checkout_data['token'],
                        'session_id': checkout_data['token'],  # For backward compatibility
                        'payment_url': checkout_data['redirect_url'],
                        'redirect_url': checkout_data['redirect_url'],
                        'amount': str(original_amount),  # Original amount
                        'amount_payment': str(payment_amount),  # Payment amount in payment currency
                        'currency': original_currency,  # Original currency
                        'payment_currency': payment_currency,  # Payment currency
                        'exchange_rate': None,  # No conversion rate since we use original currency
                        'order_id': order_data['order_id'],
                        'status': 'created',
                        'checkout_data': checkout_data
                    }
                    
                    return True, session_data
                else:
                    logger.error("PayPro response missing 'checkout' section")
                    return False, {
                        'error_code': 'INVALID_RESPONSE',
                        'error_message': 'PayPro API response format invalid'
                    }
                    
            else:
                # Handle error responses
                try:
                    error_data = response.json()
                    logger.error(f"PayPro API error: {error_data}")
                    
                    # Parse PayPro error format
                    if 'errors' in error_data:
                        error_details = []
                        for field, messages in error_data['errors'].items():
                            if isinstance(messages, list):
                                error_details.extend([f"{field}: {msg}" for msg in messages])
                            else:
                                error_details.append(f"{field}: {messages}")
                        
                        return False, {
                            'error_code': 'VALIDATION_ERROR',
                            'error_message': error_data.get('message', 'Validation failed'),
                            'error_details': error_details
                        }
                    else:
                        return False, {
                            'error_code': f'HTTP_{response.status_code}',
                            'error_message': error_data.get('message', f'PayPro API returned status {response.status_code}'),
                            'response_data': error_data
                        }
                        
                except json.JSONDecodeError:
                    logger.error(f"PayPro API error (status {response.status_code}): {response.text}")
                    return False, {
                        'error_code': f'HTTP_{response.status_code}',
                        'error_message': f'PayPro API returned status {response.status_code}',
                        'response_text': response.text
                    }
                    
        except ValueError as e:
            logger.error(f"PayPro validation error: {e}")
            return False, {
                'error_code': 'VALIDATION_ERROR',
                'error_message': str(e)
            }
        except requests.exceptions.Timeout:
            logger.error("PayPro API request timeout")
            return False, {
                'error_code': 'TIMEOUT',
                'error_message': 'PayPro API request timeout'
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(f"PayPro API connection error: {e}")
            return False, {
                'error_code': 'CONNECTION_ERROR',
                'error_message': 'Unable to connect to PayPro API'
            }
        except Exception as e:
            logger.error(f"Unexpected error in PayPro payment token creation: {e}")
            return False, {
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(e)
            }
    
    # Alias for backward compatibility
    def create_payment_session(self, order_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Backward compatibility alias for create_payment_token"""
        return self.create_payment_token(order_data)

    
    def get_payment_status(self, token: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Get payment status using token
        
        Args:
            token: Payment token from create_payment_token
            
        Returns:
            Tuple[bool, Dict]: (success, status_data)
        """
        try:
            if not token:
                return False, {
                    'error_code': 'INVALID_TOKEN',
                    'error_message': 'Token is required'
                }
            
            url = f"{self.checkout_url}/ctp/api/checkouts/{token}"
            headers = {
                'Accept': 'application/json',
                'X-API-Version': '2',
                'Authorization': self._get_auth_header()
            }
            
            logger.info(f"Checking PayPro payment status for token {token}")
            response = requests.get(url, headers=headers, timeout=30, verify=True)
            
            logger.info(f"PayPro status response: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"PayPro payment status retrieved successfully")
                logger.debug(f"PayPro status response: {json.dumps(response_data, indent=2)}")
                return True, response_data
            else:
                try:
                    error_data = response.json()
                    logger.error(f"PayPro status check error: {error_data}")
                    return False, error_data
                except json.JSONDecodeError:
                    logger.error(f"PayPro status check error (status {response.status_code}): {response.text}")
                    return False, {
                        'error_code': f'HTTP_{response.status_code}',
                        'error_message': f'PayPro API returned status {response.status_code}',
                        'response_text': response.text
                    }
                    
        except requests.exceptions.Timeout:
            logger.error("PayPro status check timeout")
            return False, {
                'error_code': 'TIMEOUT',
                'error_message': 'PayPro status check timeout'
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(f"PayPro status check connection error: {e}")
            return False, {
                'error_code': 'CONNECTION_ERROR',
                'error_message': 'Unable to connect to PayPro API'
            }
        except Exception as e:
            logger.error(f"Unexpected error in PayPro status check: {e}")
            return False, {
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(e)
            }

    
    def process_payment(self, payment_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Process payment or check payment status
        
        Args:
            payment_data: Dictionary containing payment information
                If contains 'token' or 'session_id': check payment status
                Otherwise: create new payment token
                
        Returns:
            Tuple[bool, Dict]: (success, response_data)
        """
        try:
            # Check if this is a status check request
            if 'token' in payment_data or 'session_id' in payment_data:
                token = payment_data.get('token') or payment_data.get('session_id')
                return self.get_payment_status(token)
            else:
                # Create a new payment token
                return self.create_payment_token(payment_data)
                
        except Exception as e:
            logger.error(f"Unexpected error in PayPro payment processing: {e}")
            return False, {
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(e)
            }

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify webhook signature from PayPro
        
        Note: PayPro BPC webhook signature verification implementation
        depends on their specific webhook security mechanism.
        This should be updated once PayPro provides documentation
        for webhook signature verification.
        
        Args:
            payload: Raw webhook payload
            signature: Signature header from PayPro
            
        Returns:
            bool: True if signature is valid, False otherwise
        """
        # TODO: Implement proper signature verification based on PayPro docs
        logger.warning("PayPro webhook signature verification not implemented yet")
        return True

    def handle_webhook(self, webhook_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Handle PayPro webhook notification
        
        PayPro BPC sends webhook notifications when payment status changes.
        The webhook payload format should match the transaction response format.
        
        Args:
            webhook_data: Dictionary containing webhook payload
                Expected fields depend on PayPro webhook format:
                - checkout: Payment checkout data
                - transaction: Transaction information
                - status: Payment status
                
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            logger.info(f"PayPro webhook received: {json.dumps(webhook_data, indent=2)}")
            
            # PayPro BPC webhook format may vary - adapt based on actual webhook structure
            # Common fields to look for:
            checkout_data = webhook_data.get('checkout', {})
            transaction_data = webhook_data.get('transaction', {})
            
            # Extract key information
            token = checkout_data.get('token') or webhook_data.get('token', '')
            tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                          transaction_data.get('tracking_id') or 
                          webhook_data.get('tracking_id', ''))
            
            status = (transaction_data.get('status') or 
                     checkout_data.get('status') or 
                     webhook_data.get('status', ''))
            
            transaction_id = (transaction_data.get('id') or 
                            webhook_data.get('transaction_id', ''))
            
            logger.info(f"Webhook parsed - token: {token}, tracking_id: {tracking_id}, status: {status}, transaction_id: {transaction_id}")
            
            # Determine payment result based on status
            if status in ['completed', 'succeeded', 'success', 'paid']:
                logger.info(f"Payment completed for order {tracking_id}")
                return True, 'Payment completed successfully'
            elif status in ['failed', 'declined', 'error']:
                logger.warning(f"Payment failed for order {tracking_id}")
                return False, 'Payment failed'
            elif status in ['pending', 'processing', 'authorized']:
                logger.info(f"Payment pending for order {tracking_id}")
                return True, f'Payment status: {status}'
            elif status in ['cancelled', 'canceled']:
                logger.info(f"Payment cancelled for order {tracking_id}")
                return False, 'Payment cancelled'
            else:
                logger.warning(f"Unknown payment status for order {tracking_id}: {status}")
                return True, f'Payment status: {status}'
                
        except Exception as e:
            logger.error(f"Error handling PayPro webhook: {e}")
            logger.error(f"Webhook data: {json.dumps(webhook_data, indent=2)}")
            return False, f'Webhook handling error: {str(e)}'
    
    def create_recurring_token(self, order_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a payment token for recurring payments
        
        Args:
            order_data: Order data with additional recurring payment settings
            
        Returns:
            Tuple[bool, Dict]: (success, response_data)
        """
        try:
            # Add recurring contract to the order data
            modified_order_data = order_data.copy()
            
            # Get the base payment token payload
            success, response = self.create_payment_token(modified_order_data)
            
            if not success:
                return success, response
                
            # If we need to modify the payload for recurring payments,
            # we would override the create_payment_token method or
            # add specific recurring parameters here
            logger.info(f"Recurring payment token created for order {order_data['order_id']}")
            
            return success, response
            
        except Exception as e:
            logger.error(f"Error creating recurring payment token: {e}")
            return False, {
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(e)
            }
    
    def create_oneclick_token(self, order_data: Dict[str, Any], card_token: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a payment token for one-click payments with saved card
        
        Args:
            order_data: Order data
            card_token: Saved card token
            
        Returns:
            Tuple[bool, Dict]: (success, response_data)
        """
        try:
            # Validate input
            self._validate_order_data(order_data)
            
            if not card_token:
                raise ValueError("Card token is required for one-click payments")
            
            url = f"{self.checkout_url}/ctp/api/checkouts"
            return_urls = self._get_return_urls()
            
            # Handle currency conversion for one-click payment
            original_amount = Decimal(str(order_data['amount']))
            original_currency = order_data['currency'].upper()
            
            # Use original currency without conversion
            payment_currency = original_currency
            payment_amount = original_amount
            
            # # Convert to BYN if needed
            # if original_currency == 'EUR':
            #     byn_amount = currency_converter.convert_eur_to_byn(original_amount)
            #     payment_currency = 'BYN'
            # elif original_currency == 'BYN':
            #     byn_amount = original_amount
            #     payment_currency = 'BYN'
            # else:
            #     byn_amount = currency_converter.convert_eur_to_byn(original_amount)
            #     payment_currency = 'BYN'
            
            # Convert amount to minimal units (kopecks/cents)
            if payment_currency in ['EUR', 'USD', 'BYN']:
                amount_minimal_units = int(payment_amount * Decimal('100'))
            else:
                # For other currencies, assume 100 subunits = 1 main unit
                amount_minimal_units = int(payment_amount * Decimal('100'))
            
            # Build payload with saved card token
            payload = {
                "checkout": {
                    "test": False,
                    "transaction_type": "payment",
                    "order": {
                        "amount": amount_minimal_units,
                        "currency": payment_currency,
                        "description": order_data.get('description', f"Payment for Order #{order_data['order_id']}"),
                        "tracking_id": str(order_data['order_id'])
                    },
                    "customer": {
                        "email": order_data['customer_email'],
                        "first_name": order_data.get('customer_first_name', ''),
                        "last_name": order_data.get('customer_last_name', '')
                    },
                    "settings": {
                        "success_url": return_urls['success_url'],
                        "decline_url": return_urls['decline_url'],
                        "fail_url": return_urls['fail_url'],
                        "cancel_url": return_urls['cancel_url'],
                        "notification_url": return_urls['notification_url'],
                        "language": order_data.get('language', 'en')
                    },
                    "payment_method": {
                        "types": ["credit_card"],
                        "credit_card": {
                            "token": card_token
                        }
                    }
                }
            }
            
            headers = self._get_api_headers()
            
            logger.info(f"Creating PayPro one-click payment token for order {order_data['order_id']}")
            response = requests.post(url, json=payload, headers=headers, timeout=30, verify=True)
            
            if response.status_code in [200, 201]:
                response_data = response.json()
                logger.info(f"PayPro one-click payment token created successfully")
                
                if 'checkout' in response_data:
                    checkout_data = response_data['checkout']
                    return True, {
                        'token': checkout_data['token'],
                        'payment_url': checkout_data['redirect_url'],
                        'amount': str(original_amount),
                        'amount_payment': str(payment_amount),
                        'currency': original_currency,
                        'payment_currency': payment_currency,
                        'order_id': order_data['order_id'],
                        'checkout_data': checkout_data
                    }
                    
            # Handle errors
            try:
                error_data = response.json()
                return False, error_data
            except json.JSONDecodeError:
                return False, {
                    'error_code': f'HTTP_{response.status_code}',
                    'error_message': f'PayPro API returned status {response.status_code}'
                }
                
        except ValueError as e:
            return False, {
                'error_code': 'VALIDATION_ERROR',
                'error_message': str(e)
            }
        except Exception as e:
            logger.error(f"Error creating one-click payment token: {e}")
            return False, {
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(e)
            }
