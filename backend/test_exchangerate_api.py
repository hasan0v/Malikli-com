#!/usr/bin/env python
"""
Test script for ExchangeRate-API.com integration
This script verifies that the currency conversion service is working properly.
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import requests
from decimal import Decimal
from orders.currency_service import currency_converter
from django.conf import settings
from django.core.cache import cache

def test_exchangerate_api_direct():
    """Test direct API call to exchangerate-api.com"""
    print("=" * 60)
    print("TESTING DIRECT API CONNECTION TO EXCHANGERATE-API.COM")
    print("=" * 60)
    
    api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
    
    if not api_key:
        print("❌ No EXCHANGE_RATE_API_KEY found in settings")
        print("📝 To get a free API key:")
        print("   1. Visit https://exchangerate-api.com/")
        print("   2. Sign up for a free account (1,500 requests/month)")
        print("   3. Get your API key")
        print("   4. Add EXCHANGE_RATE_API_KEY=your_key_here to your .env file")
        return False
    
    print(f"✅ API Key found: {api_key[:8]}...")
    
    try:
        # Test the API endpoint
        url = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/EUR/BYN"
        print(f"🔗 Testing URL: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📄 Response Data: {data}")
            
            if data.get('result') == 'success':
                rate = data.get('conversion_rate')
                print(f"✅ SUCCESS! EUR to BYN rate: {rate}")
                print(f"💰 1 EUR = {rate} BYN")
                return True
            else:
                print(f"❌ API Error: {data.get('error-type', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
        return False

def test_fallback_apis():
    """Test fallback APIs when exchangerate-api.com is not available"""
    print("\n" + "=" * 60)
    print("TESTING FALLBACK APIs")
    print("=" * 60)
    
    # Test exchangerate.host (free, no API key required)
    print("\n🔄 Testing exchangerate.host (free, no API key)...")
    try:
        url = "https://api.exchangerate.host/convert"
        params = {
            'from': 'EUR',
            'to': 'BYN',
            'amount': 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                rate = data.get('result')
                print(f"✅ exchangerate.host SUCCESS! EUR to BYN rate: {rate}")
            else:
                print(f"❌ exchangerate.host Error: {data}")
        else:
            print(f"❌ exchangerate.host HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ exchangerate.host Exception: {e}")

def test_currency_service():
    """Test our currency conversion service"""
    print("\n" + "=" * 60)
    print("TESTING CURRENCY CONVERSION SERVICE")
    print("=" * 60)
    
    # Clear cache to force fresh API call
    cache.delete('eur_to_byn_rate')
    print("🗑️  Cleared cached exchange rate")
    
    try:
        # Test getting exchange rate
        print("\n🔄 Testing get_eur_to_byn_rate()...")
        rate = currency_converter.get_eur_to_byn_rate()
        print(f"✅ Exchange rate: {rate}")
        
        # Test conversion
        print("\n🔄 Testing EUR to BYN conversion...")
        eur_amount = Decimal('100.00')
        byn_amount = currency_converter.convert_eur_to_byn(eur_amount)
        print(f"💰 {eur_amount} EUR = {byn_amount} BYN")
        
        # Test reverse conversion
        print("\n🔄 Testing BYN to EUR conversion...")
        eur_converted_back = currency_converter.convert_byn_to_eur(byn_amount)
        print(f"💰 {byn_amount} BYN = {eur_converted_back} EUR")
        
        # Test display amounts
        print("\n🔄 Testing get_display_amounts()...")
        amounts = currency_converter.get_display_amounts(Decimal('50.00'))
        print(f"📊 Display amounts for 50 EUR:")
        print(f"   EUR: {amounts['eur']}")
        print(f"   BYN: {amounts['byn']}")
        print(f"   Rate: {amounts['rate']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Currency service error: {e}")
        return False

def test_settings_configuration():
    """Test Django settings configuration"""
    print("\n" + "=" * 60)
    print("TESTING DJANGO SETTINGS CONFIGURATION")
    print("=" * 60)
    
    print(f"💱 PAYMENT_CURRENCY: {getattr(settings, 'PAYMENT_CURRENCY', 'Not Set')}")
    print(f"📈 EUR_TO_BYN_FALLBACK_RATE: {getattr(settings, 'EUR_TO_BYN_FALLBACK_RATE', 'Not Set')}")
    print(f"🔑 EXCHANGE_RATE_API_KEY: {'Set' if getattr(settings, 'EXCHANGE_RATE_API_KEY', None) else 'Not Set'}")
    print(f"⏰ CURRENCY_CACHE_TIMEOUT: {getattr(settings, 'CURRENCY_CACHE_TIMEOUT', 'Not Set')} seconds")
    
    # Test fallback rate type
    fallback_rate = getattr(settings, 'EUR_TO_BYN_FALLBACK_RATE', '3.2')
    print(f"🔍 Fallback rate type: {type(fallback_rate)} (should be str)")
    
    try:
        decimal_rate = Decimal(str(fallback_rate))
        print(f"✅ Fallback rate converts to Decimal: {decimal_rate}")
    except Exception as e:
        print(f"❌ Fallback rate conversion error: {e}")

def main():
    """Main test function"""
    print("🚀 EXCHANGERATE-API.COM INTEGRATION TEST")
    print("=" * 60)
    
    # Test settings
    test_settings_configuration()
    
    # Test direct API connection
    api_success = test_exchangerate_api_direct()
    
    # Test fallback APIs
    test_fallback_apis()
    
    # Test currency service
    service_success = test_currency_service()
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    if api_success and service_success:
        print("✅ ALL TESTS PASSED! ExchangeRate-API.com integration is working!")
    elif service_success:
        print("⚠️  Currency service works but primary API may need setup")
        print("💡 Consider getting an API key from exchangerate-api.com for better reliability")
    else:
        print("❌ TESTS FAILED! Please check configuration and network connection")
    
    print("\n📚 Next steps:")
    print("1. If you don't have an API key, get one from https://exchangerate-api.com/")
    print("2. Add EXCHANGE_RATE_API_KEY=your_key to your .env file")
    print("3. Restart your Django server")
    print("4. Test a payment to verify currency conversion")

if __name__ == "__main__":
    main()
