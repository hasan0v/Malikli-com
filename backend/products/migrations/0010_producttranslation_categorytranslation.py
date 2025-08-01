# Generated by Django 4.2.23 on 2025-06-18 14:57

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_remove_product_products_pr_is_arch_e4b8a9_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductTranslation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language_code', models.CharField(choices=[('ru', 'Russian'), ('en', 'English')], db_index=True, max_length=10)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='translations', to='products.product')),
            ],
            options={
                'indexes': [models.Index(fields=['product', 'language_code'], name='products_pr_product_661a6e_idx'), models.Index(fields=['language_code'], name='products_pr_languag_7b10d1_idx')],
                'unique_together': {('product', 'language_code')},
            },
        ),
        migrations.CreateModel(
            name='CategoryTranslation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language_code', models.CharField(choices=[('ru', 'Russian'), ('en', 'English')], db_index=True, max_length=10)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='translations', to='products.category')),
            ],
            options={
                'indexes': [models.Index(fields=['category', 'language_code'], name='products_ca_categor_f79541_idx'), models.Index(fields=['language_code'], name='products_ca_languag_148d4b_idx')],
                'unique_together': {('category', 'language_code')},
            },
        ),
    ]
