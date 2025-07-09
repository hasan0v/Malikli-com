"use client";

import React from 'react';
import styles from './LoadingCircle.module.css';

interface LoadingCircleProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

const LoadingCircle: React.FC<LoadingCircleProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  className = ''
}) => {
  return (
    <div className={`${styles.loadingContainer} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]} ${styles[color]}`}>
        <div className={styles.bounce1}></div>
        <div className={styles.bounce2}></div>
        <div className={styles.bounce3}></div>
      </div>
      {text && <p className={styles.loadingText}>{text}</p>}
    </div>
  );
};

export default LoadingCircle;
