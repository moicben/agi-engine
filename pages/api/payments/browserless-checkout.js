export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { cardNumber, cardExpiry, cardCVC, cardOwner, amount } = req.body || {};

    // Basic mock validation to simulate stages
    const errors = [];
    if (!cardNumber || String(cardNumber).length < 15) errors.push('invalid_card_number');
    if (!cardExpiry || !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(cardExpiry)) errors.push('invalid_expiry');
    if (!cardCVC || String(cardCVC).length < 3) errors.push('invalid_cvc');
    if (!cardOwner) errors.push('invalid_owner');

    // Stage timings (simulate async work)
    await new Promise((r) => setTimeout(r, 800)); // initial
    await new Promise((r) => setTimeout(r, 600)); // extended

    // Decide outcome
    const approved = errors.length === 0;
    const finalStatus = approved ? 'APPROVED' : 'DECLINED';

    res.status(200).json({
      data: {
        finalStatus: { value: finalStatus },
        amount,
      },
      errors,
      duration: 1400,
    });
  } catch (e) {
    res.status(500).json({ message: 'Internal error', error: e.message });
  }
}


