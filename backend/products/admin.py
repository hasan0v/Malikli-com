from django.contrib import admin
from .models import Category, Product, ProductVariant, ProductImage, Size, Color, ProductTranslation, CategoryTranslation
from django.http import HttpResponseRedirect
from django.urls import path
from django.shortcuts import render, get_object_or_404
from django import forms
from django.contrib import messages
from django.utils.html import format_html

# Add this helper class after imports but before other admin classes
class VariantBulkCreateForm(forms.Form):
    """Form for bulk creating variants"""
    sizes = forms.ModelMultipleChoiceField(
        queryset=Size.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple
    )
    colors = forms.ModelMultipleChoiceField(
        queryset=Color.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple
    )
    
    def clean(self):
        cleaned_data = super().clean()
        if not cleaned_data.get('sizes') and not cleaned_data.get('colors'):
            raise forms.ValidationError("You must select at least one size or color.")
        return cleaned_data

class ProductTranslationInline(admin.TabularInline):
    model = ProductTranslation
    extra = 1
    fields = ('language_code', 'name', 'description')
    
class CategoryTranslationInline(admin.TabularInline):
    model = CategoryTranslation
    extra = 1
    fields = ('language_code', 'name', 'description')

@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order')
    search_fields = ('name',)
    ordering = ('display_order', 'name')

@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'hex_code', 'display_order')
    search_fields = ('name', 'hex_code')
    ordering = ('display_order', 'name')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent_category', 'is_active', 'created_at')
    list_filter = ('is_active', 'parent_category')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [CategoryTranslationInline]

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ('sku_suffix', 'name_suffix', 'size', 'color', 'attributes', 'additional_price', 'image', 'is_active')
    autocomplete_fields = ['size', 'color']

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'category', 'base_price', 'buy_now_link', 'is_archived', 'created_at')
    list_filter = ('is_archived', 'category')
    search_fields = ('name', 'slug', 'sku_prefix', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductTranslationInline, ProductVariantInline, ProductImageInline]
    actions = ['bulk_create_variants']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'sku_prefix', 'description', 'category')
        }),
        ('Pricing & Buy Now', {
            'fields': ('base_price', 'buy_now_link'),
            'description': 'Set the base price and external payment link for Buy Now functionality'
        }),
        ('Additional Info', {
            'fields': ('tags', 'is_archived'),
            'classes': ('collapse',)
        })
    )
    
    def get_urls(self):
        urls = super(ProductAdmin, self).get_urls()
        custom_urls = [
            path(
                '<path:object_id>/variants/bulk-create/',
                self.admin_site.admin_view(self.bulk_create_variants_view),
                name='products_product_bulk_create_variants',
            ),
        ]
        return custom_urls + urls
    
    def bulk_create_variants(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, "Please select only one product for this action.", level=messages.WARNING)
            return
        
        product = queryset.first()
        return HttpResponseRedirect(f"../admin/products/product/{product.id}/variants/bulk-create/")
    
    bulk_create_variants.short_description = "Bulk create variants"
    
    def bulk_create_variants_view(self, request, object_id):
        product = get_object_or_404(Product, pk=object_id)
        
        if request.method == 'POST':
            form = VariantBulkCreateForm(request.POST)
            if form.is_valid():
                sizes = form.cleaned_data.get('sizes')
                colors = form.cleaned_data.get('colors')
                
                # Create variants from selected sizes and colors
                created_variants = product.create_variants_from_options(
                    sizes=list(sizes) if sizes else None,
                    colors=list(colors) if colors else None
                )
                
                self.message_user(
                    request, 
                    f"Successfully created {len(created_variants)} variants for {product.name}",
                    level=messages.SUCCESS
                )
                return HttpResponseRedirect("../../")
        else:
            form = VariantBulkCreateForm()
        
        context = {
            'form': form,
            'product': product,
            'title': f'Bulk Create Variants for {product.name}',
            'opts': self.model._meta,
            'has_change_permission': self.has_change_permission(request),
            'original': product,
        }
        
        return render(request, 'admin/products/product/bulk_create_variants.html', context)

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'product', 'size', 'color', 'additional_price', 'is_active')
    list_filter = ('is_active', 'size', 'color', 'product__category')
    search_fields = ('product__name', 'sku_suffix', 'name_suffix')
    autocomplete_fields = ['product', 'size', 'color']
    
    def get_full_name(self, obj):
        return f"{obj.product.name} - {obj.get_display_name()}"
    get_full_name.short_description = 'Full Name'

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('alt_text', 'product', 'variant', 'display_order', 'is_primary')
    list_filter = ('is_primary', 'product__category')
    search_fields = ('alt_text', 'product__name', 'variant__name_suffix')
    autocomplete_fields = ['product', 'variant']

# Register translation models for standalone admin
@admin.register(ProductTranslation)
class ProductTranslationAdmin(admin.ModelAdmin):
    list_display = ('product', 'language_code', 'name')
    list_filter = ('language_code',)
    search_fields = ('product__name', 'name', 'description')
    autocomplete_fields = ['product']

@admin.register(CategoryTranslation)
class CategoryTranslationAdmin(admin.ModelAdmin):
    list_display = ('category', 'language_code', 'name')
    list_filter = ('language_code',)
    search_fields = ('category__name', 'name', 'description')
    autocomplete_fields = ['category']
