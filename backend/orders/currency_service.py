# orders/currency_service.py
import requests
import logging
from typing import Dict, Optional
from django.conf import settings
from django.core.cache import cache
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

class CurrencyConverter:
    """
    Currency conversion service for EUR to BYN conversion
    Uses exchange rate APIs with caching for performance
    """
    
    def __init__(self):
        # Default fallback rate if API fails (approximate EUR to BYN rate)
        self.fallback_rate = Decimal(str(getattr(settings, 'EUR_TO_BYN_FALLBACK_RATE', '3.2')))
        
        # Exchange rate API configuration
        self.exchange_api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
        self.cache_timeout = getattr(settings, 'CURRENCY_CACHE_TIMEOUT', 3600)  # 1 hour
        
    def get_eur_to_byn_rate(self) -> Decimal:
        """
        Get current EUR to BYN exchange rate
        
        Returns:
            Decimal: Exchange rate (1 EUR = X BYN)
        """
        # Check cache first
        cached_rate = cache.get('eur_to_byn_rate')
        if cached_rate:
            logger.info(f"Using cached EUR to BYN rate: {cached_rate}")
            return Decimal(str(cached_rate))
        
        # Try to fetch from multiple APIs
        rate = self._fetch_exchange_rate()
        
        if rate:
            # Cache the rate
            cache.set('eur_to_byn_rate', float(rate), self.cache_timeout)
            logger.info(f"Fetched and cached EUR to BYN rate: {rate}")
            return rate
        else:
            # Use fallback rate
            logger.warning(f"Using fallback EUR to BYN rate: {self.fallback_rate}")
            return self.fallback_rate
    
    def _fetch_exchange_rate(self) -> Optional[Decimal]:
        """
        Fetch exchange rate from external APIs
        
        Returns:
            Optional[Decimal]: Exchange rate or None if failed
        """
        # Try exchangerate-api.com (free tier available)
        if self.exchange_api_key:
            rate = self._fetch_from_exchangerate_api()
            if rate:
                return rate
        
        # Try fixer.io as backup
        rate = self._fetch_from_fixer_api()
        if rate:
            return rate
        
        # Try exchangerate.host (free, no API key required)
        rate = self._fetch_from_exchangerate_host()
        if rate:
            return rate
        
        return None
    
    def _fetch_from_exchangerate_api(self) -> Optional[Decimal]:
        """Fetch from exchangerate-api.com"""
        try:
            url = f"https://v6.exchangerate-api.com/v6/{self.exchange_api_key}/pair/EUR/BYN"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == 'success':
                    rate = data.get('conversion_rate')
                    if rate:
                        return Decimal(str(rate))
            
        except Exception as e:
            logger.error(f"Error fetching rate from exchangerate-api.com: {e}")
        
        return None
    
    def _fetch_from_fixer_api(self) -> Optional[Decimal]:
        """Fetch from fixer.io"""
        try:
            url = "https://api.fixer.io/latest"
            params = {
                'base': 'EUR',
                'symbols': 'BYN'
            }
            
            if hasattr(settings, 'FIXER_API_KEY'):
                params['access_key'] = settings.FIXER_API_KEY
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    rates = data.get('rates', {})
                    byn_rate = rates.get('BYN')
                    if byn_rate:
                        return Decimal(str(byn_rate))
            
        except Exception as e:
            logger.error(f"Error fetching rate from fixer.io: {e}")
        
        return None
    
    def _fetch_from_exchangerate_host(self) -> Optional[Decimal]:
        """Fetch from exchangerate.host (free, no API key required)"""
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
                    if rate:
                        return Decimal(str(rate))
            
        except Exception as e:
            logger.error(f"Error fetching rate from exchangerate.host: {e}")
        
        return None
    
    def convert_eur_to_byn(self, eur_amount: Decimal) -> Decimal:
        """
        Convert EUR amount to BYN
        
        Args:
            eur_amount: Amount in EUR
            
        Returns:
            Decimal: Amount in BYN
        """
        if not isinstance(eur_amount, Decimal):
            eur_amount = Decimal(str(eur_amount))
        
        rate = self.get_eur_to_byn_rate()
        byn_amount = eur_amount * rate
        
        # Round to 2 decimal places
        byn_amount = byn_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        logger.info(f"Converted {eur_amount} EUR to {byn_amount} BYN (rate: {rate})")
        return byn_amount
    
    def convert_byn_to_eur(self, byn_amount: Decimal) -> Decimal:
        """
        Convert BYN amount to EUR (for display purposes)
        
        Args:
            byn_amount: Amount in BYN
            
        Returns:
            Decimal: Amount in EUR
        """
        if not isinstance(byn_amount, Decimal):
            byn_amount = Decimal(str(byn_amount))
        
        rate = self.get_eur_to_byn_rate()
        eur_amount = byn_amount / rate
        
        # Round to 2 decimal places
        eur_amount = eur_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        logger.info(f"Converted {byn_amount} BYN to {eur_amount} EUR (rate: {rate})")
        return eur_amount
    
    def get_display_amounts(self, eur_amount: Decimal) -> Dict[str, Decimal]:
        """
        Get both EUR and BYN amounts for display
        
        Args:
            eur_amount: Original amount in EUR
            
        Returns:
            Dict: {'eur': eur_amount, 'byn': byn_amount, 'rate': exchange_rate}
        """
        byn_amount = self.convert_eur_to_byn(eur_amount)
        rate = self.get_eur_to_byn_rate()
        
        return {
            'eur': eur_amount,
            'byn': byn_amount,
            'rate': rate
        }

# Global instance
currency_converter = CurrencyConverter()
