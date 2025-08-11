import React, { useState } from 'react';

export default function BookingPopup({ open, onClose, onSubmit, defaultEmail = '' }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const isGmail = /@gmail\.com$/i.test(email);
    if (!isGmail) {
      alert('Veuillez utiliser une adresse Gmail valide.');
      return;
    }
    onSubmit({ firstName, lastName, email, phone, description });
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Réserver un créneau</h2>
        <form onSubmit={handleSubmit}>
          <div className="formRow">
            <input className="input" placeholder="Prénom" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            <input className="input" placeholder="Nom" value={lastName} onChange={e=>setLastName(e.target.value)} required />
          </div>
          <div style={{ marginTop: 12 }}>
            <input className="input" type="email" placeholder="Email (Gmail)" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginTop: 12 }}>
            <input className="input" type="tel" placeholder="Téléphone" value={phone} onChange={e=>setPhone(e.target.value)} required />
          </div>
          <div style={{ marginTop: 12 }}>
            <textarea className="textarea" placeholder="Description" rows={3} value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" className="button cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="button">Continuer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
