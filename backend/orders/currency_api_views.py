# orders/currency_api_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from decimal import Decimal
import json

from .currency_service import currency_converter

@api_view(['GET'])
@permission_classes([AllowAny])
def get_exchange_rate(request):
    """
    Get current EUR to BYN exchange rate
    """
    try:
        rate = currency_converter.get_eur_to_byn_rate()
        
        # Determine source
        source = 'api'  # Default assumption
        if rate == currency_converter.fallback_rate:
            source = 'fallback'
        
        return Response({
            'rate': float(rate),
            'source': source,
        })
    except Exception as e:
        return Response({
            'rate': float(currency_converter.fallback_rate),
            'source': 'fallback',
            'error': str(e)
        }, status=status.HTTP_200_OK)  # Still return 200 with fallback

@api_view(['POST'])
@permission_classes([AllowAny])
def convert_eur_to_byn(request):
    """
    Convert EUR amount to BYN
    """
    try:
        data = request.data
        eur_amount = data.get('eur_amount')
        
        if eur_amount is None:
            return Response({
                'error': 'eur_amount is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            eur_amount = Decimal(str(eur_amount))
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid eur_amount format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if eur_amount < 0:
            return Response({
                'error': 'eur_amount must be non-negative'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert using currency service
        byn_amount = currency_converter.convert_eur_to_byn(eur_amount)
        exchange_rate = currency_converter.get_eur_to_byn_rate()
        
        # Determine source
        source = 'api'  # Default assumption
        if exchange_rate == currency_converter.fallback_rate:
            source = 'fallback'
        
        return Response({
            'eur_amount': float(eur_amount),
            'byn_amount': float(byn_amount),
            'exchange_rate': float(exchange_rate),
            'source': source,
        })
        
    except Exception as e:
        # Return fallback conversion
        try:
            eur_amount = Decimal(str(request.data.get('eur_amount', 0)))
            fallback_rate = currency_converter.fallback_rate
            byn_amount = eur_amount * fallback_rate
            
            return Response({
                'eur_amount': float(eur_amount),
                'byn_amount': float(byn_amount),
                'exchange_rate': float(fallback_rate),
                'source': 'fallback',
                'error': str(e)
            })
        except:
            return Response({
                'error': 'Currency conversion failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@require_http_methods(["GET"])
def get_exchange_rate_simple(request):
    """
    Simple function-based view for exchange rate (no DRF)
    """
    try:
        rate = currency_converter.get_eur_to_byn_rate()
        
        # Determine source
        source = 'api'  # Default assumption
        if rate == currency_converter.fallback_rate:
            source = 'fallback'
        
        return JsonResponse({
            'rate': float(rate),
            'source': source,
        })
    except Exception as e:
        return JsonResponse({
            'rate': float(currency_converter.fallback_rate),
            'source': 'fallback',
            'error': str(e)
        })

@csrf_exempt
@require_http_methods(["POST"])
def convert_eur_to_byn_simple(request):
    """
    Simple function-based view for currency conversion (no DRF)
    """
    try:
        data = json.loads(request.body)
        eur_amount = data.get('eur_amount')
        
        if eur_amount is None:
            return JsonResponse({
                'error': 'eur_amount is required'
            }, status=400)
        
        try:
            eur_amount = Decimal(str(eur_amount))
        except (ValueError, TypeError):
            return JsonResponse({
                'error': 'Invalid eur_amount format'
            }, status=400)
        
        if eur_amount < 0:
            return JsonResponse({
                'error': 'eur_amount must be non-negative'
            }, status=400)
        
        # Convert using currency service
        byn_amount = currency_converter.convert_eur_to_byn(eur_amount)
        exchange_rate = currency_converter.get_eur_to_byn_rate()
        
        # Determine source
        source = 'api'  # Default assumption
        if exchange_rate == currency_converter.fallback_rate:
            source = 'fallback'
        
        return JsonResponse({
            'eur_amount': float(eur_amount),
            'byn_amount': float(byn_amount),
            'exchange_rate': float(exchange_rate),
            'source': source,
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON format'
        }, status=400)
    except Exception as e:
        # Return fallback conversion
        try:
            data = json.loads(request.body)
            eur_amount = Decimal(str(data.get('eur_amount', 0)))
            fallback_rate = currency_converter.fallback_rate
            byn_amount = eur_amount * fallback_rate
            
            return JsonResponse({
                'eur_amount': float(eur_amount),
                'byn_amount': float(byn_amount),
                'exchange_rate': float(fallback_rate),
                'source': 'fallback',
                'error': str(e)
            })
        except:
            return JsonResponse({
                'error': 'Currency conversion failed'
            }, status=500)
