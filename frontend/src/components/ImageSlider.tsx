"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../app/home.module.css';

interface SliderItem {
  id: number;
  type: 'image';
  src: string;
  alt: string;
  slug?: string;
  title?: string;
  description?: string;
}

interface ImageSliderProps {
  items: SliderItem[];
}

const ImageSlider: React.FC<ImageSliderProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Add a client-side only flag to handle hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark component as client-side rendered after mount
    setIsClient(true);
    
    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, items.length]);
  // Add a function to handle clicks on slides
  // const handleSlideClick = (slug?: string) => {
  //   if (slug) {
  //     window.location.href = `/categories/${slug}`;
  //   }
  // };

  return (
    <div className={styles.sliderSection}>
      {items.map((item, index) => (        <div
          key={item.id}
          className={`${styles.slide} ${index === currentIndex ? styles.active : ''}`}
          // onClick={() => handleSlideClick(item.slug)}
          // role={item.slug ? "button" : undefined}
          // tabIndex={item.slug ? 0 : undefined}
          // aria-label={item.slug ? `View ${item.title || item.slug} collection` : undefined}
          // onKeyDown={(e) => {
          //   if (item.slug && (e.key === 'Enter' || e.key === ' ')) {
          //     handleSlideClick(item.slug);
          //     e.preventDefault();
          //   }
          // }}
        >
          {item.type === 'image' && (
            <div className={styles.imageContainer}>
              <Image 
                src={item.src} 
                alt={item.alt} 
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                priority={index === 0} 
                className={styles.sliderImage}
              />              {(item.title || item.description) && (
                <div className={styles.slideCaption}>
                  {/* {item.title && <h2>{item.title}</h2>}
                  {item.description && <p>{item.description}</p>} */}
                  {/* {item.slug && (
                    <Link href={`/categories/${item.slug}`} className={styles.slideButton}>
                      Смотреть Коллекцию
                    </Link>
                  )} */}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ImageSlider;