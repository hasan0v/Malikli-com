'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './aboutPage.module.css';
import SafeImage from '../../components/SafeImage';
import crownSvg from '../../../public/crown.svg';
import messageSvg from '../../../public/message.svg';
import diamondsSvg from '../../../public/diamonds.svg';

const AboutPage = () => {
  const { t } = useI18n();  const stats = [
    { number: '2025', label: t('about.stats.foundingYear'), icon: '🎯' },
    { number: '500+', label: t('about.stats.uniqueProducts'), icon: '💎' },
    { number: '10K+', label: t('about.stats.happyCustomers'), icon: '👥' },
    { number: '24/7', label: t('about.stats.customerSupport'), icon: '🛡️' }
  ];
  const timeline = [
    {
      year: '2025',
      title: t('about.timeline.founding.title'),
      description: t('about.timeline.founding.description'),
      icon: '🚀'
    },
    {
      year: '2025',
      title: t('about.timeline.firstDrops.title'),
      description: t('about.timeline.firstDrops.description'),
      icon: '✨'
    },
    {
      year: '2025',
      title: t('about.timeline.expansion.title'),
      description: t('about.timeline.expansion.description'),
      icon: '📈'
    },
    {
      year: '2025',
      title: t('about.timeline.future.title'),
      description: t('about.timeline.future.description'),
      icon: '🌍'
    }
  ];  const team = [
    {
      name: 'Emin Malikli ',
      role: t('about.team.founder.role'),
      description: t('about.team.founder.description'),
      image: '/team/founder.jpg',
      social: { email: 'support@malikli1992.com' }
    }
  ];

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{t('about.hero.title')}</h1>
            {/* <p className={styles.heroSubtitle}>
              {t('about.hero.subtitle')}
            </p> */}
            <p className={styles.heroDescription}>
              {t('about.hero.description')}
            </p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.logoCircle}>
              <div className={styles.logoText}>MALIKLI</div>
              <div className={styles.logoSubtext}>1992</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section> */}
      {/* Story Section */}
      <section className={styles.storySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('about.story.title')}</h2>
          <p className={styles.sectionSubtitle}>
            {t('about.story.subtitle')}
          </p>
        </div>
        <div className={styles.storyContent}>
          <div className={styles.storyText}>
            <p>
              {t('about.story.paragraph1')}
            </p>
            <p>
              {t('about.story.paragraph2')}
            </p>
            <p>
              {t('about.story.paragraph3')}
            </p>
          </div>
          <div className={styles.storyVisual}>
            <div className={styles.storyCard}>
              <div className={styles.storyCardIcon}>📈</div>
              <h4>{t('about.story.cards.growth.title')}</h4>
              <p>{t('about.story.cards.growth.description')}</p>
            </div>
            <div className={styles.storyCard}>
              <div className={styles.storyCardIcon}>🎨</div>
              <h4>{t('about.story.cards.creativity.title')}</h4>
              <p>{t('about.story.cards.creativity.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className={styles.timelineSection}>        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('about.timeline.sectionTitle')}</h2>
          <p className={styles.sectionSubtitle}>
            {t('about.timeline.sectionSubtitle')}
          </p>
        </div>
        <div className={styles.timeline}>
          {timeline.map((item, index) => (
            <div key={index} className={styles.timelineItem}>
              <div className={styles.timelineIcon}>{item.icon}</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineYear}>{item.year}</div>
                <h4 className={styles.timelineTitle}>{item.title}</h4>
                <p className={styles.timelineDescription}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className={styles.missionVisionSection}>        <div className={styles.missionVisionGrid}>
          <div className={styles.missionCard}>
            <div className={styles.cardIcon}>🎯</div>
            <h3>{t('about.mission.title')}</h3>
            <p>
              {t('about.mission.description')}
            </p>
          </div>
          <div className={styles.visionCard}>
            <div className={styles.cardIcon}>🌟</div>
            <h3>{t('about.vision.title')}</h3>
            <p>
              {t('about.vision.description')}
            </p>
          </div>
        </div>
      </section>      {/* Values Section */}
      <section className={styles.valuesSection}>        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('about.values.title')}</h2>
          <p className={styles.sectionSubtitle}>
            {t('about.values.subtitle')}
          </p>
        </div>
        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>
              <SafeImage src={crownSvg.src} alt={t('about.values.exclusivity.iconAlt')} width={60} height={60} />
            </div>
            <h3>{t('about.values.exclusivity.title')}</h3>
            <p>{t('about.values.exclusivity.description')}</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>
              <SafeImage src={diamondsSvg.src} alt={t('about.values.quality.iconAlt')} width={60} height={60} />
            </div>
            <h3>{t('about.values.quality.title')}</h3>
            <p>{t('about.values.quality.description')}</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>
              <SafeImage src={messageSvg.src} alt={t('about.values.community.iconAlt')} width={60} height={60} />
            </div>
            <h3>{t('about.values.community.title')}</h3>
            <p>{t('about.values.community.description')}</p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('about.team.title')}</h2>
          <p className={styles.sectionSubtitle}>
            {t('about.team.subtitle')}
          </p>
        </div>
        <div className={styles.teamGrid}>
          {team.map((member, index) => (
            <div key={index} className={styles.teamCard}>
              <div className={styles.teamAvatar}>
                <div className={styles.avatarPlaceholder}>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <div className={styles.teamInfo}>
                <h4 className={styles.teamName}>{member.name}</h4>
                <p className={styles.teamRole}>{member.role}</p>
                <p className={styles.teamDescription}>{member.description}</p>                <div className={styles.teamContact}>
                  <a href={`mailto:${member.social.email}`} className={styles.contactLink}>
                    <span className={styles.contactIcon}>✉️</span>
                    <span>{t('about.team.contact.email')}</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>        <div className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h3>{t('about.cta.title')}</h3>
            <p>
              {t('about.cta.description')}
            </p>
            <div className={styles.ctaActions}>
              <a href="/auth/register" className={styles.ctaButton}>
                {t('about.cta.register')}
              </a>
              <a href="/drops" className={styles.ctaButtonSecondary}>
                {t('about.cta.viewDrops')}
              </a>
            </div>
          </div>
          <div className={styles.ctaVisual}>
            <div className={styles.ctaIcon}>🚀</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;

