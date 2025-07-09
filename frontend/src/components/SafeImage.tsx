"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface SafeImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  'data-priority'?: string; // Add support for data-priority attribute
  [key: string]: any; // Allow other props to pass through
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  quality = 80,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...otherProps // Capture all other props including data-priority
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!priority); // Priority images don't need loading state

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc('/placeholder-product.jpg');
    }
    if (!priority) {
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    if (!priority) {
      setIsLoading(false);
    }
  };
  // Generate a simple blur data URL if none provided
  const defaultBlurDataURL = blurDataURL || 
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHw/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAhEQACAQIHAQAAAAAAAAAAAAABAgADBAUREiExQVFhkf/aAAwDAQACEQMRAD8A0XGMATzntEeiTz/Y/9k=';  // For priority images, render directly with no wrappers or opacity controls
  if (priority) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={true}
        loading="eager"
        quality={95}
        placeholder="empty"
        sizes={sizes}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={true} // Skip Next.js image optimization for priority images
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'cover'
        }}
        {...otherProps} // Pass through data-priority and other attributes
      />
    );
  }
  // For non-priority images, use the loading states
  return (
    <div className={`${className} relative`} style={{ aspectRatio: `${width}/${height}` }}>
      {isLoading && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-200 rounded"
          style={{ 
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerAnimation 1.5s infinite'
          }}
        />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-100`}
        priority={false}
        loading={loading}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        sizes={sizes}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'cover'
        }}
        {...otherProps} // Pass through data-priority and other attributes
      />
    </div>
  );
};

export default SafeImage;