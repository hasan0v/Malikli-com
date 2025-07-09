# Generated migration to add database indexes for performance optimization

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_fix_productimage_created_at'),
    ]

    operations = [
        # Add indexes to Category model
        migrations.AlterField(
            model_name='category',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, max_length=120, unique=True),
        ),
        migrations.AlterField(
            model_name='category',
            name='parent_category',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.SET_NULL, related_name='subcategories', to='products.category'),
        ),
        migrations.AlterField(
            model_name='category',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='category',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        
        # Add indexes to Product model
        migrations.AlterField(
            model_name='product',
            name='name',
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='product',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, max_length=270, unique=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='sku_prefix',
            field=models.CharField(blank=True, db_index=True, max_length=50, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='category',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.SET_NULL, related_name='products', to='products.category'),
        ),
        migrations.AlterField(
            model_name='product',
            name='base_price',
            field=models.DecimalField(db_index=True, decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name='product',
            name='is_archived',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='product',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        
        # Add indexes to ProductVariant model
        migrations.AlterField(
            model_name='productvariant',
            name='product',
            field=models.ForeignKey(db_index=True, on_delete=models.deletion.CASCADE, related_name='variants', to='products.product'),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='sku_suffix',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='size',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.SET_NULL, related_name='variants', to='products.size'),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='color',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.SET_NULL, related_name='variants', to='products.color'),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='additional_price',
            field=models.DecimalField(db_index=True, decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='productvariant',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        
        # Add indexes to ProductImage model
        migrations.AlterField(
            model_name='productimage',
            name='product',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.CASCADE, related_name='images', to='products.product'),
        ),
        migrations.AlterField(
            model_name='productimage',
            name='variant',
            field=models.ForeignKey(blank=True, db_index=True, null=True, on_delete=models.deletion.CASCADE, related_name='images', to='products.productvariant'),
        ),
        migrations.AlterField(
            model_name='productimage',
            name='display_order',
            field=models.IntegerField(db_index=True, default=0),
        ),
        migrations.AlterField(
            model_name='productimage',
            name='is_primary',
            field=models.BooleanField(db_index=True, default=False),
        ),
        
        # Add composite indexes for better query performance
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['is_active', 'created_at'], name='products_ca_is_acti_0f7c98_idx'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['parent_category', 'is_active'], name='products_ca_parent__44b8f2_idx'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=models.Index(fields=['slug'], name='products_ca_slug_fb2c72_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_archived', 'created_at'], name='products_pr_is_arch_e4b8a9_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['category', 'is_archived'], name='products_pr_categor_7c5b12_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['base_price', 'is_archived'], name='products_pr_base_pr_d9f8e3_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['name', 'is_archived'], name='products_pr_name_8a2c41_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['slug'], name='products_pr_slug_6e7d9a_idx'),
        ),
        migrations.AddIndex(
            model_name='productvariant',
            index=models.Index(fields=['product', 'is_active'], name='products_pr_product_3b9f82_idx'),
        ),
        migrations.AddIndex(
            model_name='productvariant',
            index=models.Index(fields=['size', 'color'], name='products_pr_size_id_a7c4d1_idx'),
        ),
        migrations.AddIndex(
            model_name='productvariant',
            index=models.Index(fields=['is_active', 'created_at'], name='products_pr_is_acti_7f3e85_idx'),
        ),
        migrations.AddIndex(
            model_name='productimage',
            index=models.Index(fields=['product', 'display_order'], name='products_pr_product_2c8b94_idx'),
        ),
        migrations.AddIndex(
            model_name='productimage',
            index=models.Index(fields=['variant', 'display_order'], name='products_pr_variant_5d7a63_idx'),
        ),
        migrations.AddIndex(
            model_name='productimage',
            index=models.Index(fields=['is_primary'], name='products_pr_is_prim_4f9c82_idx'),
        ),
    ]
