// Frontend inventory types
export interface VariantInventory {
  variant_id: number;
  sku: string;
  size?: string;
  color?: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_in_stock: boolean;
  is_low_stock: boolean;
  additional_price: number;
}

export interface ProductInventoryStatus {
  product_id: number;
  product_name: string;
  variants: VariantInventory[];
}

export interface StockCheckItem {
  type: 'variant' | 'drop_product';
  id: number;
  quantity: number;
}

export interface StockCheckResult {
  type: 'variant' | 'drop_product';
  id: number;
  quantity_requested: number;
  available_quantity: number;
  stock_quantity: number;
  reserved_quantity: number;
  available: boolean;
  product_name: string;
  variant_name?: string;
  drop_price?: number;
  is_low_stock: boolean;
  error?: string;
}

export interface StockAvailabilityResponse {
  all_available: boolean;
  items: StockCheckResult[];
  total_items_checked: number;
}

export interface UserReservation {
  id: number;
  order_number: string;
  quantity: number;
  expires_at: string;
  minutes_remaining: number;
  item_type: 'variant' | 'drop_product';
  item_id: number;
  item_name: string;
  created_at: string;
}

export interface UserReservationsResponse {
  reservations: UserReservation[];
  total_reserved_items: number;
}

export interface LowStockVariant {
  variant_id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  variant_name: string;
  sku: string;
  available_quantity: number;
  low_stock_threshold: number;
  reserved_quantity: number;
  stock_quantity: number;
}

export interface LowStockDropProduct {
  drop_id: number;
  product_name: string;
  drop_price: number;
  available_quantity: number;
  low_stock_threshold: number;
  reserved_quantity: number;
  stock_quantity: number;
}

export interface LowStockAlertsResponse {
  low_stock_variants: LowStockVariant[];
  low_stock_drop_products: LowStockDropProduct[];
  total_count: number;
}

export interface BulkStockUpdate {
  type: 'variant' | 'drop_product';
  id: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
}

export interface BulkStockUpdateResult {
  type: 'variant' | 'drop_product';
  id: number;
  success: boolean;
  item_name?: string;
  new_stock_quantity?: number;
  new_available_quantity?: number;
  new_low_stock_threshold?: number;
  error?: string;
}

export interface BulkStockUpdateResponse {
  results: BulkStockUpdateResult[];
  total_updates: number;
  successful_updates: number;
  failed_updates: number;
}

export interface InventoryDashboardSummary {
  total_active_variants: number;
  total_drop_products: number;
  low_stock_items: number;
  out_of_stock_variants: number;
  total_reserved_items: number;
  active_reservations_24h: number;
}

export interface DashboardLowStockItem {
  id: number;
  name: string;
  available_quantity: number;
  low_stock_threshold: number;
  product_name: string;
}

export interface DashboardReservation {
  id: number;
  quantity: number;
  expires_at: string;
  item_name: string;
  order_number?: string;
}

export interface InventoryDashboardResponse {
  summary: InventoryDashboardSummary;
  low_stock_variants: DashboardLowStockItem[];
  low_stock_drop_products: DashboardLowStockItem[];
  recent_reservations: DashboardReservation[];
}

// Enhanced product variant type with inventory
export interface ProductVariantWithInventory {
  id: number;
  product: number;
  sku_suffix: string;
  name_suffix?: string;
  size?: number;
  size_info?: {
    id: number;
    name: string;
    display_order: number;
  };
  color?: number;
  color_info?: {
    id: number;
    name: string;
    hex_code: string;
    display_order: number;
  };
  attributes?: Record<string, any>;
  additional_price: string;
  image?: string;
  is_active: boolean;
  images: Array<{
    id: number;
    image: string;
    alt_text?: string;
    display_order: number;
    is_primary: boolean;
  }>;
  
  // Inventory fields
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  available_quantity: number;
  is_in_stock: boolean;
  is_low_stock: boolean;
}
