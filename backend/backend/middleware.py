# Custom middleware for performance optimizations
from django.utils.cache import add_never_cache_headers, patch_cache_control
from django.utils.deprecation import MiddlewareMixin
from django.utils import translation
from django.conf import settings
import time

class CacheHeadersMiddleware(MiddlewareMixin):
    """
    Add appropriate cache headers for API responses
    """
    
    def process_response(self, request, response):
        # Add cache headers for API endpoints
        if request.path.startswith('/api/'):
            if request.method == 'GET':
                # Cache GET requests for 5 minutes
                patch_cache_control(response, public=True, max_age=300)
                response['Vary'] = 'Accept-Encoding, Authorization'
            else:
                # Don't cache non-GET requests
                add_never_cache_headers(response)
        
        return response

class ResponseTimeMiddleware(MiddlewareMixin):
    """
    Add response time header for performance monitoring
    """
    
    def process_request(self, request):
        request.start_time = time.time()
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            response['X-Response-Time'] = f'{duration:.3f}s'
        return response

class LanguageMiddleware(MiddlewareMixin):
    """
    Set language based on query parameters or Accept-Language header
    """
    
    def process_request(self, request):
        # Get all supported languages from settings
        supported_languages = dict(settings.LANGUAGES)
        
        # First check for lang query parameter
        lang_param = request.GET.get('lang')
        if lang_param and lang_param in supported_languages:
            translation.activate(lang_param)
            request.LANGUAGE_CODE = lang_param
            return
            
        # Then check for Accept-Language header
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        if accept_language:
            # Parse the Accept-Language header
            for lang_entry in accept_language.split(','):
                # Handle entries like 'en-US;q=0.9'
                parts = lang_entry.split(';', 1)
                lang_code = parts[0].strip()
                
                # Try the exact language code first
                if lang_code in supported_languages:
                    translation.activate(lang_code)
                    request.LANGUAGE_CODE = lang_code
                    return
                
                # Try the base language code (e.g., 'en' from 'en-US')
                base_lang = lang_code.split('-')[0]
                if base_lang in supported_languages:
                    translation.activate(base_lang)
                    request.LANGUAGE_CODE = base_lang
                    return
        
        # Default to the settings.LANGUAGE_CODE
        translation.activate(settings.LANGUAGE_CODE)
        request.LANGUAGE_CODE = settings.LANGUAGE_CODE
