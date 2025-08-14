from datetime import timedelta
from django.db.models import Count, Sum
from django.utils import timezone
from django.db.models.functions import TruncDate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import WebsiteEvent
from .serializers import WebsiteEventCreateSerializer
from orders.models import Order, OrderItem


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def record_event(request):
    """Record a lightweight website event (currently only 'click')."""
    serializer = WebsiteEventCreateSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        WebsiteEvent.objects.create(
            event_type=data['event_type'],
            path=data['path'][:512],
            session_id=data.get('session_id'),
            user=request.user if request.user.is_authenticated else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            extra=data.get('extra')
        )
        return Response({"status": "ok"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def analytics_dashboard(request):
    """Return aggregated metrics for admin analytics dashboard."""
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = today_start - timedelta(days=6)
    thirty_days_ago = today_start - timedelta(days=29)

    paid_orders = Order.objects.filter(payment_status='paid')
    paid_orders_today = paid_orders.filter(created_at__gte=today_start)
    paid_orders_7d = paid_orders.filter(created_at__gte=seven_days_ago)
    paid_orders_30d = paid_orders.filter(created_at__gte=thirty_days_ago)

    revenue_total = paid_orders.aggregate(v=Sum('total_amount'))['v'] or 0
    revenue_today = paid_orders_today.aggregate(v=Sum('total_amount'))['v'] or 0
    revenue_7d = paid_orders_7d.aggregate(v=Sum('total_amount'))['v'] or 0
    revenue_30d = paid_orders_30d.aggregate(v=Sum('total_amount'))['v'] or 0

    total_paid_orders = paid_orders.count()
    total_orders_today = paid_orders_today.count()
    total_orders_7d = paid_orders_7d.count()
    total_orders_30d = paid_orders_30d.count()

    aov = float(revenue_total) / total_paid_orders if total_paid_orders else 0

    status_counts = Order.objects.values('order_status').annotate(count=Count('order_id'))

    top_products_qs = (OrderItem.objects.filter(order__payment_status='paid')
                       .values('product_name_snapshot')
                       .annotate(quantity=Sum('quantity'), revenue=Sum('subtotal'))
                       .order_by('-quantity')[:5])
    top_products = [
        {
            'name': p['product_name_snapshot'],
            'quantity': p['quantity'],
            'revenue': p['revenue']
        } for p in top_products_qs
    ]

    events = WebsiteEvent.objects.filter(event_type='click')
    events_today = events.filter(created_at__gte=today_start)
    events_24h = events.filter(created_at__gte=now - timedelta(hours=24))
    events_7d = events.filter(created_at__gte=seven_days_ago)

    total_clicks = events.count()
    clicks_today = events_today.count()
    clicks_24h = events_24h.count()
    clicks_7d = events_7d.count()

    top_paths = (events_7d.values('path')
                 .annotate(count=Count('id'))
                 .order_by('-count')[:5])

    fourteen_days_ago = today_start - timedelta(days=13)
    click_ts_raw = (events.filter(created_at__date__gte=fourteen_days_ago.date())
                    .annotate(day=TruncDate('created_at'))
                    .values('day')
                    .annotate(count=Count('id')))
    click_map = {row['day'].isoformat(): row['count'] for row in click_ts_raw}
    click_timeseries = []
    for i in range(14):
        day = fourteen_days_ago + timedelta(days=i)
        key = day.date().isoformat()
        click_timeseries.append({'date': key, 'clicks': click_map.get(key, 0)})

    revenue_ts_raw = (paid_orders.filter(created_at__date__gte=thirty_days_ago.date())
                      .annotate(day=TruncDate('created_at'))
                      .values('day')
                      .annotate(revenue=Sum('total_amount'), orders=Count('order_id')))
    rev_map = {row['day'].isoformat(): {'revenue': row['revenue'], 'orders': row['orders']} for row in revenue_ts_raw}
    revenue_timeseries = []
    for i in range(30):
        day = thirty_days_ago + timedelta(days=i)
        key = day.date().isoformat()
        data = rev_map.get(key, {'revenue': 0, 'orders': 0})
        revenue_timeseries.append({'date': key, **data})

    # Visitor (unique) metrics - we use distinct authenticated user ids vs distinct anonymous session_ids
    # NOTE: historical anonymous events without a session_id cannot be uniquely counted; they are ignored for uniqueness.
    registered_total = events.exclude(user__isnull=True).values('user').distinct().count()
    registered_7d = events_7d.exclude(user__isnull=True).values('user').distinct().count()
    anonymous_total = events.filter(user__isnull=True).exclude(session_id__isnull=True).values('session_id').distinct().count()
    anonymous_7d = events_7d.filter(user__isnull=True).exclude(session_id__isnull=True).values('session_id').distinct().count()

    return Response({
        'orders': {
            'total_paid_orders': total_paid_orders,
            'orders_today': total_orders_today,
            'orders_7d': total_orders_7d,
            'orders_30d': total_orders_30d,
            'revenue_total': revenue_total,
            'revenue_today': revenue_today,
            'revenue_7d': revenue_7d,
            'revenue_30d': revenue_30d,
            'average_order_value': round(aov, 2),
            'status_breakdown': list(status_counts),
            'top_products': top_products,
        },
        'clicks': {
            'total_clicks': total_clicks,
            'clicks_today': clicks_today,
            'clicks_24h': clicks_24h,
            'clicks_7d': clicks_7d,
            'top_paths_7d': list(top_paths),
            'timeseries_14d': click_timeseries,
        },
        'visitors': {
            'registered_total': registered_total,
            'registered_7d': registered_7d,
            'anonymous_total': anonymous_total,
            'anonymous_7d': anonymous_7d,
        },
        'timeseries': {
            'revenue_30d': revenue_timeseries,
            'clicks_14d': click_timeseries,
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def analytics_timeseries(request):
    """Return combined timeseries for a selectable window (default 30 days)."""
    try:
        days = int(request.GET.get('days', 30))
    except ValueError:
        days = 30
    days = max(1, min(days, 90))

    now = timezone.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    paid_orders = Order.objects.filter(payment_status='paid', created_at__date__gte=start.date())
    events = WebsiteEvent.objects.filter(event_type='click', created_at__date__gte=start.date())

    revenue_ts_raw = (paid_orders
                      .annotate(day=TruncDate('created_at'))
                      .values('day')
                      .annotate(revenue=Sum('total_amount'), orders=Count('order_id')))
    rev_map = {row['day'].isoformat(): row for row in revenue_ts_raw}

    click_ts_raw = (events
                    .annotate(day=TruncDate('created_at'))
                    .values('day')
                    .annotate(clicks=Count('id')))
    click_map = {row['day'].isoformat(): row for row in click_ts_raw}

    series = []
    for i in range(days):
        day = start + timedelta(days=i)
        key = day.date().isoformat()
        rev = rev_map.get(key, {'revenue': 0, 'orders': 0})
        clicks = click_map.get(key, {'clicks': 0})
        series.append({'date': key, 'revenue': rev.get('revenue', 0), 'orders': rev.get('orders', 0), 'clicks': clicks.get('clicks', 0)})

    return Response({'days': days, 'start_date': start.date(), 'timeseries': series})
