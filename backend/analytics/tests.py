from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import WebsiteEvent


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(email='admin@example.com', password='pass1234')

    def test_record_event_and_dashboard(self):
        url = reverse('record-analytics-event')
        resp = self.client.post(url, {"event_type": "click", "path": "/home"}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(WebsiteEvent.objects.count(), 1)

        dash_url = reverse('analytics-dashboard')
        self.client.login(email='admin@example.com', password='pass1234')
        resp2 = self.client.get(dash_url)
        self.assertEqual(resp2.status_code, 200)
        self.assertIn('orders', resp2.data)
        self.assertIn('clicks', resp2.data)
