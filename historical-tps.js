import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { sql } from '@vercel/postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });

// Constants
const MONERO_LAUNCH_DATE = new Date('2014-04-18T00:00:00Z');
const AVERAGE_BLOCK_TIME = 120; // 2 minutes in seconds

// Configure axios retry
axiosRetry(axios, {
  retries: 5,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 502;
  }
});

// Array of Monero nodes
const nodes = [
  'https://node.sethforprivacy.com:443',
  'https://node.community.rino.io:443',
  'https://node.monerooutreach.org:443'
];

let currentNodeIndex = 0;

function checkEnvironmentVariables() {
  const requiredEnvVars = ['POSTGRES_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  } else {
    console.log('All required environment variables are set');
  }
}

async function testDatabaseConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}
import fs from 'fs/promises';

const CHECKPOINT_FILE = 'checkpoint.json';

async function saveCheckpoint(date, currentHeight, totalTransactions) {
  const checkpoint = {
    date: date.toISOString(),
    currentHeight,
    totalTransactions
  };
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`Checkpoint saved: ${JSON.stringify(checkpoint)}`);
}

async function loadCheckpoint() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    const checkpoint = JSON.parse(data);
    console.log(`Loaded checkpoint: ${JSON.stringify(checkpoint)}`);
    return {
      date: new Date(checkpoint.date),
      currentHeight: checkpoint.currentHeight,
      totalTransactions: checkpoint.totalTransactions
    };
  } catch (error) {
    console.log('No checkpoint found or error reading checkpoint file');
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBlockWithFallback(height) {
  const totalNodes = nodes.length;
  let attempts = 0;

  while (attempts < totalNodes) {
    const node = nodes[currentNodeIndex];
    try {
      if (height === null) {
        console.log(`Attempting to fetch latest block height from ${node}`);
        const response = await axios.post(`${node}/json_rpc`, {
          jsonrpc: '2.0',
          id: '0',
          method: 'get_block_count'
        });
        console.log(`Successfully fetched latest block height: ${response.data.result.count - 1}`);
        return response.data.result.count - 1;
      } else {
        console.log(`Attempting to fetch block at height ${height} from ${node}`);
        const response = await axios.post(`${node}/json_rpc`, {
          jsonrpc: '2.0',
          id: '0',
          method: 'get_block',
          params: { height: height }
        });
        console.log(`Successfully fetched block at height ${height}`);
        return response.data.result;
      }
    } catch (error) {
      console.error(`Error with node ${node}:`, error.message);
      currentNodeIndex = (currentNodeIndex + 1) % totalNodes;
      attempts++;
    }
    await delay(2000); // Wait before trying the next node
  }
  throw new Error('All nodes failed to respond');
}

async function getBlockWithDelay(height) {
  await delay(2000); // 2 second delay
  return getBlockWithFallback(height);
}

async function getHeightAtDate(targetDate) {
  console.log(`Getting height for date: ${targetDate.toISOString()}`);
  
  // Calculate seconds since Monero launch
  const secondsSinceLaunch = (targetDate - MONERO_LAUNCH_DATE) / 1000;
  
  // Estimate block height
  let estimatedHeight = Math.max(0, Math.floor(secondsSinceLaunch / AVERAGE_BLOCK_TIME));
  
  // Fetch the block at estimated height
  let block = await getBlockWithDelay(estimatedHeight);
  let blockDate = new Date(block.timestamp * 1000);
  
  // Adjust if necessary
  if (blockDate > targetDate) {
    while (blockDate > targetDate && estimatedHeight > 0) {
      estimatedHeight = Math.max(0, estimatedHeight - 1);
      block = await getBlockWithDelay(estimatedHeight);
      blockDate = new Date(block.timestamp * 1000);
    }
  } else if (blockDate < targetDate) {
    while (blockDate < targetDate) {
      estimatedHeight++;
      block = await getBlockWithDelay(estimatedHeight);
      blockDate = new Date(block.timestamp * 1000);
    }
    estimatedHeight--; // Go back one block to ensure we're before or at the target date
  }
  
  console.log(`Found height ${estimatedHeight} for date ${targetDate.toISOString()}`);
  return estimatedHeight;
}

async function storeDailyTPS(date, tps, startTimestamp, endTimestamp, startHeight, endHeight) {
  console.log(`Storing TPS for date ${date.toISOString()}: ${tps}`);
  try {
    await sql`
      INSERT INTO DailyTPS (date, tps, start_timestamp, end_timestamp, start_height, end_height, created_at, updated_at)
      VALUES (${date.toISOString()}, ${tps}, ${startTimestamp}, ${endTimestamp}, ${startHeight}, ${endHeight}, NOW(), NOW())
      ON CONFLICT (date) DO UPDATE
      SET tps = ${tps}, 
          start_timestamp = ${startTimestamp}, 
          end_timestamp = ${endTimestamp}, 
          start_height = ${startHeight}, 
          end_height = ${endHeight}, 
          updated_at = NOW()
    `;
    console.log(`Successfully stored TPS for date ${date.toISOString()}`);
  } catch (error) {
    console.error(`Error storing TPS for date ${date.toISOString()}:`, error);
  }
}
export async function calculateAndStoreHistoricalTPS() {
  checkEnvironmentVariables();
  await testDatabaseConnection();
  try {
    console.log('Starting historical TPS calculation');

    await sql`
      CREATE TABLE IF NOT EXISTS DailyTPS (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        tps FLOAT NOT NULL,
        start_timestamp BIGINT NOT NULL,
        end_timestamp BIGINT NOT NULL,
        start_height INTEGER NOT NULL,
        end_height INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `;
    console.log('Ensured DailyTPS table exists with updated schema');

    const checkpoint = await loadCheckpoint();
    let currentDate = checkpoint ? new Date(checkpoint.date) : new Date('2014-04-18');
    const endDate = new Date();

    while (currentDate <= endDate) {
      try {
        console.log(`Calculating TPS for ${currentDate.toISOString().split('T')[0]}`);

        let startHeight, endHeight, totalTransactions;

        if (checkpoint && currentDate.toISOString().split('T')[0] === checkpoint.date.split('T')[0]) {
          startHeight = checkpoint.currentHeight;
          totalTransactions = checkpoint.totalTransactions;
          console.log(`Resuming from checkpoint: height ${startHeight}, transactions ${totalTransactions}`);
        } else {
          startHeight = await getHeightAtDate(currentDate);
          totalTransactions = 0;
        }

        console.log(`Start height: ${startHeight}`);

        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        endHeight = await getHeightAtDate(nextDate);
        console.log(`End height: ${endHeight}`);

        if (startHeight === endHeight) {
          console.log(`No blocks for date ${currentDate.toISOString().split('T')[0]}, skipping`);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        let startTimestamp, endTimestamp;

        for (let height = startHeight; height <= endHeight; height++) {
          const block = await getBlockWithDelay(height);
          if (height === startHeight) startTimestamp = block.timestamp;
          if (height === endHeight) endTimestamp = block.timestamp;
          
          if (block.transactions && Array.isArray(block.transactions)) {
            totalTransactions += block.transactions.length;
          } else {
            console.log(`Block at height ${height} has no transactions array`);
          }

          // Save checkpoint after each block
          await saveCheckpoint(currentDate, height, totalTransactions);
        }

        const timeSpan = endTimestamp - startTimestamp;
        const tps = timeSpan > 0 ? totalTransactions / timeSpan : 0;

        if (isNaN(tps) || !isFinite(tps)) {
          console.log(`Invalid TPS calculated for ${currentDate.toISOString().split('T')[0]}, skipping`);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        await storeDailyTPS(currentDate, tps, startTimestamp, endTimestamp, startHeight, endHeight);

        console.log(`TPS for ${currentDate.toISOString().split('T')[0]}: ${tps}`);

        // Clear checkpoint after successful day processing
        await fs.unlink(CHECKPOINT_FILE).catch(() => {});

      } catch (error) {
        console.error(`Error processing date ${currentDate.toISOString()}:`, error);
        await delay(60000); // Wait for 1 minute before trying the next date
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Historical TPS calculation completed');
    await displayStoredData();

  } catch (error) {
    console.error('Error in calculateAndStoreHistoricalTPS:', error.message);
    console.error('Stack trace:', error.stack);
  }
}


async function displayStoredData() {
  try {
    const result = await sql`SELECT * FROM DailyTPS ORDER BY date DESC LIMIT 5`;
    console.log('Recent entries in DailyTPS table:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error displaying stored data:', error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running calculateAndStoreHistoricalTPS directly');
  calculateAndStoreHistoricalTPS()
    .then(() => console.log('Calculation complete'))
    .catch(error => console.error('Calculation failed:', error))
    .finally(() => process.exit());
}