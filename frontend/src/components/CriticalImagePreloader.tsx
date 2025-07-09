// Server-side component to preload critical images
import { Product } from '../types/product';

// This should be statically defined or fetched server-side
// For now, we'll use common image URLs that are likely to be the first products
const CRITICAL_IMAGE_URLS = [
  'https://media.malikli1992.com/media/product_images/IMG_0691-min.webp',
  'https://media.malikli1992.com/media/product_images/IMG_0702-min.webp',
  'https://media.malikli1992.com/media/product_images/IMG_0703-min.webp',
  'https://media.malikli1992.com/media/product_images/IMG_0704-min.webp',
];

export default function CriticalImagePreloader() {
  return (
    <>
      {/* Preload critical images */}
      {CRITICAL_IMAGE_URLS.map((url, index) => (
        <link
          key={`preload-image-${index}`}
          rel="preload"
          as="image"
          href={url}
          fetchPriority={index === 0 ? "high" : "low"}
        />
      ))}
      
      {/* Preconnect to image domain */}
      <link
        rel="preconnect"
        href="https://media.malikli1992.com"
        crossOrigin="anonymous"
      />
      
      {/* DNS prefetch for faster connections */}
      <link
        rel="dns-prefetch"
        href="//media.malikli1992.com"
      />
    </>
  );
}
