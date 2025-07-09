"use client";

import React from 'react';
import { CheckoutStep } from '@/types/checkout';
import { useI18n } from '@/hooks/useI18n';
import styles from './CheckoutSteps.module.css';

interface CheckoutStepsProps {
  steps: CheckoutStep[];
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
}

export default function CheckoutSteps({ steps, currentStep, onStepClick }: CheckoutStepsProps) {
  const { t } = useI18n();
  
  return (
    <div className={styles.stepsContainer}>
      <div className={styles.steps}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`${styles.step} ${step.completed ? styles.completed : ''} ${
              step.current ? styles.current : ''
            } ${step.accessible === false ? styles.disabled : ''}`}
            onClick={() => {
              // Only allow clicking on accessible steps or previous steps
              if (step.accessible !== false || step.id <= currentStep) {
                onStepClick(step.id);
              }
            }}
            style={{ 
              cursor: (step.accessible === false && step.id > currentStep) ? 'not-allowed' : 'pointer',
              opacity: (step.accessible === false && step.id > currentStep) ? 0.5 : 1
            }}
          >
            <div className={styles.stepNumber}>
              {step.completed ? (
                <span className={styles.checkmark}>✓</span>
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <div className={styles.stepLabel}>{t(step.title)}</div>
            {index < steps.length - 1 && (
              <div className={`${styles.connector} ${step.completed ? styles.connectorCompleted : ''}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
