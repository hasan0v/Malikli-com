// @ts-ignore - build system will resolve this client component
import ProductsAdminClient, {InitialProductsPayload} from './ProductsAdminClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

async function fetchInitial(): Promise<InitialProductsPayload|null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/?page=1&page_size=20&ordering=-created_at`, { next: { revalidate: 120 } });
    if(!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function AdminProductsPage(){
  const initial = await fetchInitial();
  return <ProductsAdminClient initialData={initial} />;
}
