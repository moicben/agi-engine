import React from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/components/CommonPopup.module.css';

export default function BasePopup({ isVisible, onClose, children, className = '' }) {
  if (!isVisible) return null;

  function handleWrapperClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function handlePopupClick(e) { e.stopPropagation(); }

  const popupContent = (
    <div className={styles.popupWrapper} onClick={handleWrapperClick}>
      <div className={`${styles.popup} ${className}`} onClick={handlePopupClick} data-popup="true">
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(popupContent, document.body) : null;
}
