# Generated by Django 4.2.23 on 2025-07-11 22:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0007_inventoryreservation_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='shipping_method_name_snapshot',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
