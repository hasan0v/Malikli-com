from django.test import TestCase
from unittest.mock import patch, MagicMock
from orders.paypro_service import PayProService


class PayProServiceTest(TestCase):
    def setUp(self):
        self.service = PayProService()
        
    def test_auth_header_generation(self):
        auth_header = self.service._get_auth_header()
        self.assertTrue(auth_header.startswith('Basic '))
        
    def test_return_urls_generation(self):
        urls = self.service._get_return_urls()
        self.assertIn('success_url', urls)
        self.assertIn('decline_url', urls)
        self.assertIn('fail_url', urls)
        self.assertIn('cancel_url', urls)
        self.assertIn('notification_url', urls)
        self.assertTrue(urls['notification_url'].endswith('/api/v1/webhooks/paypro'))
        
    @patch('orders.paypro_service.requests.post')
    def test_create_payment_token_success(self, mock_post):
        # Mock successful PayPro API v2 response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'checkout': {
                'token': '3241e439f8c87d941d92621a4bdc030d4c9a69c67f3b0cfe12de4a13cc34aa51',
                'redirect_url': 'https://checkout.paypro.by/v2/checkout?token=3241e439f8c87d941d92621a4bdc030d4c9a69c67f3b0cfe12de4a13cc34aa51'
            }
        }
        mock_post.return_value = mock_response
        
        order_data = {
            'order_id': 'test-order-123',
            'amount': '149.99',
            'currency': 'EUR',
            'customer_email': 'test@example.com'
        }
        
        success, result = self.service.create_payment_token(order_data)
        
        self.assertTrue(success)
        self.assertIn('token', result)
        self.assertIn('payment_url', result)
        self.assertEqual(result['token'], '3241e439f8c87d941d92621a4bdc030d4c9a69c67f3b0cfe12de4a13cc34aa51')
        
    @patch('orders.paypro_service.requests.post')
    def test_create_payment_token_failure(self, mock_post):
        # Mock failed PayPro API v2 response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'errors': {
                'order.currency': ['is invalid'],
                'order.amount': ['must be greater than 0']
            },
            'message': 'Order.currency is invalid. Order.amount must be greater than 0'
        }
        mock_post.return_value = mock_response
        
        order_data = {
            'order_id': 'test-order-123',
            'amount': '149.99',
            'currency': 'EUR',
            'customer_email': 'test@example.com'
        }
        
        success, result = self.service.create_payment_token(order_data)
        
        self.assertFalse(success)
        self.assertIn('error_code', result)
        self.assertEqual(result['error_code'], 'VALIDATION_ERROR')
