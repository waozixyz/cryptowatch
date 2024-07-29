import { calculateAndStoreHistoricalTPS } from '../historical-tps.js';

export default async function handler(req, res) {
  try {
    await calculateAndStoreHistoricalTPS();
    res.status(200).json({ message: 'TPS calculation completed' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'TPS calculation failed' });
  }
}
