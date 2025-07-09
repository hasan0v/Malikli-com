// Critical image preloader for LCP optimization
'use client';

import { useEffect } from 'react';

interface ImagePreloaderProps {
  images: string[];
  priority?: boolean;
}

export default function ImagePreloader({ images, priority = true }: ImagePreloaderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preloadImages = async () => {
      const preloadPromises = images.slice(0, 4).map(async (src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.loading = 'eager';
          img.fetchPriority = 'high';
          img.src = src;
          
          // Also create link preload for even faster loading
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = src;
          link.fetchPriority = 'high';
          document.head.appendChild(link);
        });
      });

      try {
        await Promise.allSettled(preloadPromises);
        console.log('🚀 Critical images preloaded for LCP optimization');
      } catch (error) {
        console.warn('⚠️ Some images failed to preload:', error);
      }
    };

    preloadImages();
  }, [images]);

  return null;
}
