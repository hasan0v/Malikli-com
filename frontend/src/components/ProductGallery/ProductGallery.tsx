'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/types/product';
import styles from './ProductGallery.module.css';

// SVG Icons as components
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15,18 9,12 15,6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9,18 15,12 9,6"></polyline>
  </svg>
);

const ZoomIn = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="M21 21l-4.35-4.35"></path>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const ZoomOut = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="M21 21l-4.35-4.35"></path>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const Maximize2 = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15,3 21,3 21,9"></polyline>
    <polyline points="9,21 3,21 3,15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

const X = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  onImageChange?: (imageUrl: string) => void;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  onImageChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false); // detect tall images (9:16)
  
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Ensure we have valid images
  const validImages = images.filter(img => img && img.image);
  const currentImage = validImages[currentIndex];

  // Navigate to specific image
  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < validImages.length) {
      setCurrentIndex(index);
      setIsImageLoading(true);
  setIsPortrait(false);
      onImageChange?.(validImages[index].image);
    }
  }, [validImages, onImageChange]);

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : validImages.length - 1;
    goToImage(newIndex);
  }, [currentIndex, validImages.length, goToImage]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    const newIndex = currentIndex < validImages.length - 1 ? currentIndex + 1 : 0;
    goToImage(newIndex);
  }, [currentIndex, validImages.length, goToImage]);

  // Handle zoom toggle
  const toggleZoom = useCallback(() => {
    setIsZoomed(!isZoomed);
    if (isZoomed) {
      setZoomPosition({ x: 50, y: 50 });
    }
  }, [isZoomed]);

  // Handle mouse move for zoom
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isZoomed || !mainImageRef.current) return;

    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  }, [isZoomed]);

  // Handle touch events for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't handle if touching navigation buttons or control buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.navButton}`) || target.closest(`.${styles.controlButton}`)) {
      return;
    }
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = touchStart.y - touch.clientY;
    
    // Prevent vertical scrolling during horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    // Don't handle if touching navigation buttons or control buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.navButton}`) || target.closest(`.${styles.controlButton}`)) {
      setTouchStart(null);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = touchStart.y - touch.clientY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      // Horizontal swipe - change image
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Tap without swipe - toggle zoom
      toggleZoom();
    }

    setTouchStart(null);
  }, [touchStart, goToNext, goToPrevious, toggleZoom]);

  // Handle mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't handle if clicking on navigation buttons or control buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.navButton}`) || target.closest(`.${styles.controlButton}`)) {
      return;
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
  }, []);

  const handleMouseMoveForDrag = useCallback((e: React.MouseEvent) => {
    if (!dragStart) return;
    
    // Don't handle if over navigation buttons or control buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.navButton}`) || target.closest(`.${styles.controlButton}`)) {
      return;
    }
    
    const deltaX = Math.abs(e.clientX - dragStart.x);
    const deltaY = Math.abs(e.clientY - dragStart.y);
    
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
    }
  }, [dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragStart) return;

    // Don't handle if clicking on navigation buttons or control buttons
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.navButton}`) || target.closest(`.${styles.controlButton}`)) {
      setDragStart(null);
      setIsDragging(false);
      return;
    }

    const deltaX = dragStart.x - e.clientX;
    const minDragDistance = 30;

    if (!isDragging && Math.abs(deltaX) < 10) {
      // Click without drag - always toggle zoom (both zoom in and zoom out)
      toggleZoom();
    } else if (Math.abs(deltaX) > minDragDistance) {
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setDragStart(null);
    setIsDragging(false);
  }, [dragStart, isDragging, toggleZoom, goToNext, goToPrevious]);

  // Handle fullscreen modal
  const openModal = useCallback(() => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset';
    setIsZoomed(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) {
        switch (e.key) {
          case 'Escape':
            closeModal();
            break;
          case 'ArrowLeft':
            goToPrevious();
            break;
          case 'ArrowRight':
            goToNext();
            break;
          case ' ':
            e.preventDefault();
            toggleZoom();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal, goToPrevious, goToNext, toggleZoom]);

  // Auto-scroll thumbnails to show current image
  useEffect(() => {
    if (thumbnailsRef.current) {
      const thumbnailElement = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (thumbnailElement) {
        thumbnailElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentIndex]);

  if (!validImages.length) {
    return (
      <div className={styles.gallery}>
        <div className={styles.mainImageContainer}>
          <div className={styles.noImagePlaceholder}>
            <span>No images available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.gallery}>
        {/* Main Image */}
        <div 
          ref={mainImageRef}
          className={`${styles.mainImageContainer} ${isZoomed ? styles.zoomed : ''} ${isPortrait ? styles.portrait : ''}`}
          onMouseMove={isZoomed ? handleMouseMove : handleMouseMoveForDrag}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Blurred filler background for tall (portrait) images to reduce empty side space */}
          {isPortrait && (
            <div className={styles.bgFiller} style={{backgroundImage:`url(${currentImage.image})`}} aria-hidden='true' />
          )}
          {/* Loading Overlay */}
          {isImageLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner}></div>
            </div>
          )}

          {/* Main Image */}
          <Image
            src={currentImage.image}
            alt={currentImage.alt_text || `${productName} - Image ${currentIndex + 1}`}
            fill
            className={`${styles.mainImage} ${isZoomed ? styles.zoomedImage : ''}`}
            style={{
              transformOrigin: isZoomed ? `${zoomPosition.x}% ${zoomPosition.y}%` : 'center center'
            }}
            onLoadingComplete={(img)=>{
              setIsImageLoading(false);
              if(img.naturalWidth && img.naturalHeight){
                const ratio = img.naturalWidth / img.naturalHeight; // <1 means portrait
                setIsPortrait(ratio < 0.85); // threshold ~ 9:16 (0.5625) with buffer
              }
            }}
            onError={() => setIsImageLoading(false)}
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw"
          />

          {/* Navigation Arrows */}
          {validImages.length > 1 && (
            <>
              <button
                className={`${styles.navButton} ${styles.prevButton}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                aria-label="Previous image"
              >
                <ChevronLeft />
              </button>
              <button
                className={`${styles.navButton} ${styles.nextButton}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                aria-label="Next image"
              >
                <ChevronRight />
              </button>
            </>
          )}

          {/* Control Buttons */}
          <div className={styles.controlButtons}>
            <button
              className={styles.controlButton}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
              aria-label="View fullscreen"
            >
              <Maximize2 />
            </button>
          </div>

          {/* Image Counter */}
          {validImages.length > 1 && (
            <div className={styles.imageCounter}>
              {currentIndex + 1} / {validImages.length}
            </div>
          )}

          {/* Zoom Hint */}
          {!isZoomed && (
            <div className={styles.zoomHint}>
              Click to zoom
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {validImages.length > 1 && (
          <div className={styles.thumbnailsContainer} ref={thumbnailsRef}>
            {validImages.map((image, index) => (
              <button
                key={`${image.id}-${index}`}
                className={`${styles.thumbnail} ${index === currentIndex ? styles.activeThumbnail : ''}`}
                onClick={() => goToImage(index)}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={image.image}
                  alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                  fill
                  className={styles.thumbnailImage}
                />
                {index === currentIndex && <div className={styles.activeThumbnailOverlay} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalCloseButton}
              onClick={closeModal}
              aria-label="Close fullscreen"
            >
              <X />
            </button>

            <div 
              className={`${styles.modalImageContainer} ${isZoomed ? styles.modalZoomed : ''}`}
              onMouseMove={handleMouseMove}
            >
              <Image
                src={currentImage.image}
                alt={currentImage.alt_text || `${productName} - Full size`}
                fill
                className={`${styles.modalImage} ${isZoomed ? styles.modalImageZoomed : ''}`}
                style={{
                  transformOrigin: isZoomed ? `${zoomPosition.x}% ${zoomPosition.y}%` : 'center center'
                }}
                sizes="100vw"
              />
            </div>

            {validImages.length > 1 && (
              <>
                <button
                  className={`${styles.modalNavButton} ${styles.modalPrevButton}`}
                  onClick={goToPrevious}
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </button>
                <button
                  className={`${styles.modalNavButton} ${styles.modalNextButton}`}
                  onClick={goToNext}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </button>
              </>
            )}

            <div className={styles.modalControls}>
              {validImages.length > 1 && (
                <div className={styles.modalImageCounter}>
                  {currentIndex + 1} / {validImages.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductGallery;
