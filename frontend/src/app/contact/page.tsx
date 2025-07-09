'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import emailjs from '@emailjs/browser';
import styles from './contact.module.css';

export default function ContactPage() {
  const { t } = useI18n();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Auto-fill form data from user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.first_name || user.last_name || '',
        email: user.email || ''
      }));
    }
  }, [isAuthenticated, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {      // EmailJS configuration
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_name: 'Malikli1992 Team'
      };

      const result = await emailjs.send(
        'service_nf604ld', // SERVICE_ID
        'template_0vnaj2c', // TEMPLATE_ID
        templateParams,
        '037LRbdfVdiKdAuaI' // PUBLIC_KEY
      );      console.log('Email sent successfully:', result);
      setSubmitStatus('success');
      
      // Only clear subject and message, keep name and email for authenticated users
      if (isAuthenticated && user) {
        setFormData(prev => ({
          ...prev,
          subject: '',
          message: ''
        }));      } else {
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      }

    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };  return (
    <div className={styles.contactPage}>
      {/* Floating background elements */}
      <div className={styles.floatingElements}>
        <div className={`${styles.floatingCircle} ${styles.circle1}`}></div>
        <div className={`${styles.floatingCircle} ${styles.circle2}`}></div>
        <div className={`${styles.floatingCircle} ${styles.circle3}`}></div>
        <div className={`${styles.floatingCircle} ${styles.circle4}`}></div>
      </div>      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{t('contactPage.hero.title')}</h1>
          <p className={styles.heroSubtitle}>
            {t('contactPage.hero.subtitle')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.contactContainer}>

        <div className={styles.content}>
          <div className={styles.contactInfo}>
            <h2 className={styles.contactInfoTitle}>{t('contactPage.contactInfo.title')}</h2>              <div className={styles.infoItem}>
              <div className={styles.infoIcon}>📧</div>
              <div className={styles.infoText}>
                <div className={styles.infoLabel}>{t('contactPage.contactInfo.email.label')}</div>
                <div className={styles.infoValue}>
                  <a href="mailto:support@malikli1992.com">{t('contactPage.contactInfo.email.value')}</a>
                </div>
              </div>            </div>            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>⏰</div>
              <div className={styles.infoText}>
                <div className={styles.infoLabel}>{t('contactPage.contactInfo.hours.label')}</div>
                <div className={styles.infoValue}>
                  {t('contactPage.contactInfo.hours.value')}
                </div>
              </div>
            </div>
            {/* <div className={styles.infoItem}>
              <div className={styles.infoIcon}>📍</div>
              <div className={styles.infoText}>
                <div className={styles.infoLabel}>{t('contactPage.contactInfo.address.label')}</div>
                <div className={styles.infoValue}>
                  {t('contactPage.contactInfo.address.value')}
                </div>
              </div>
            </div> */}
          </div>          <div className={styles.formSection}>
            <h2 className={styles.formTitle}>{t('contactPage.form.title')}</h2>              {/* User authentication notification */}
            {isAuthenticated && user && (
              <div className={`${styles.message} ${styles.info}`}>
                ℹ️ {t('contactPage.form.userNotification', { name: user.first_name || user.email })}
              </div>
            )}
            
            {submitStatus === 'success' && (
              <div className={`${styles.message} ${styles.success}`}>
                ✅ {t('contactPage.form.messages.success')}
              </div>
            )}

            {submitStatus === 'error' && (
              <div className={`${styles.message} ${styles.error}`}>
                ❌ {t('contactPage.form.messages.error')}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    {t('contactPage.form.fields.name.label')} <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    placeholder={t('contactPage.form.fields.name.placeholder')}
                    className={styles.input}
                  />
                </div>                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                    {t('contactPage.form.fields.email.label')} <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    placeholder={t('contactPage.form.fields.email.placeholder')}
                    className={styles.input}
                  />
                </div>
              </div>              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="subject" className={styles.label}>
                    {t('contactPage.form.fields.subject.label')} <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    placeholder={t('contactPage.form.fields.subject.placeholder')}
                    className={styles.input}
                  />
                </div>
              </div>              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>
                  {t('contactPage.form.fields.message.label')} <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  rows={6}
                  placeholder={t('contactPage.form.fields.message.placeholder')}
                  className={styles.textarea}
                />
              </div>              <button 
                type="submit" 
                className={`${styles.submitButton} ${isSubmitting ? styles.submitting : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    {t('contactPage.form.submit.submitting')}
                  </>
                ) : (
                  t('contactPage.form.submit.idle')
                )}
              </button></form>
          </div>
        </div>
      </div>
    </div>
  );
}
