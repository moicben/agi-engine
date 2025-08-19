import { initiateG2AWorkflow } from '../../../scripts/puppeteer/g2a/initiate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productUrl } = req.body;
    
    if (!productUrl) {
      return res.status(400).json({ error: 'productUrl is required' });
    }

    const response = await initiateG2AWorkflow(productUrl);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in initiate checkout:', error);
    res.status(500).json({ error: error.message });
  }
}
