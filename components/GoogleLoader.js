import React from 'react';
import styles from '../styles/modules/GoogleLoader.module.css';

const GoogleLoader = ({ 
  loadingText = 'Chargement...', 
  className = '',
  showOverlay = true,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const loaderContent = (
    <div className={`${styles.googleLoader} ${styles[size]} ${className}`}>
      <div className={styles.googleSpinner}>
        <div className={styles.googleSpinnerBlue}></div>
        <div className={styles.googleSpinnerRed}></div>
        <div className={styles.googleSpinnerYellow}></div>
        <div className={styles.googleSpinnerGreen}></div>
      </div>
      {loadingText && <p className={styles.loadingText}>{loadingText}</p>}
    </div>
  );

  if (showOverlay) {
    return (
      <div className={styles.overlayLoader}>
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

export default GoogleLoader;