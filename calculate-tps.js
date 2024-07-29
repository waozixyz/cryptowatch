import { calculateAndStoreHistoricalTPS } from '../historical-tps.js';


module.exports = async (req, res) => {
    try {
      await calculateAndStoreHistoricalTPS();
      res.status(200).send('TPS calculation completed');
    } catch (error) {
      console.error('Error in TPS calculation:', error);
      res.status(500).send('Error in TPS calculation');
    }
  };