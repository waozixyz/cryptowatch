require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const { Sequelize, DataTypes } = require('sequelize');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const NODES = [
    "https://node.sethforprivacy.com:443",
    "http://nodes.hashvault.pro:18081",
    "http://node.c3pool.com:18081",
    "http://node.community.rino.io:18081",
    "http://node.moneroworld.com:18089",
    "http://xmr-node.cakewallet.com:18081"
];

async function getWorkingNode() {
    for (const node of NODES) {
        try {
            const url = `${node}/json_rpc`;
            const payload = {
                jsonrpc: "2.0",
                id: "0",
                method: "get_info",
                params: {}
            };
            const response = await axios.post(url, payload, { timeout: 5000 });
            if (response.status === 200) {
                console.log(`Connected to node: ${node}`);
                return url;
            }
        } catch (error) {
            console.log(`Failed to connect to node: ${node}`);
        }
    }
    throw new Error("Failed to connect to any node");
}
async function getMostRecentTPS() {
    try {
        const mostRecent = await DailyTPS.findOne({
            order: [['date', 'DESC']]
        });
        return mostRecent ? mostRecent.tps : null;
    } catch (error) {
        console.error(`Error fetching most recent TPS: ${error.message}`);
        return null;
    }
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
  
  // Define model
  const DailyTPS = sequelize.define('DailyTPS', {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    tps: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  });

sequelize.sync({ alter: true }).then(() => {
    console.log("Database & tables created!");
  }).catch((error) => {
    console.error("Error syncing database:", error);
  });

async function getBlock(height, nodeUrl) {
    const payload = {
        jsonrpc: "2.0",
        id: "0",
        method: "get_block",
        params: { height }
    };
    const response = await axios.post(nodeUrl, payload);
    return response.data.result;
}

async function calculateTPS(startHeight, endHeight, nodeUrl) {
    const startBlock = await getBlock(startHeight, nodeUrl);
    const endBlock = await getBlock(endHeight, nodeUrl);
    
    let totalTransactions = 0;
    for (let height = startHeight; height <= endHeight; height++) {
        const block = await getBlock(height, nodeUrl);
        if ('tx_hashes' in block) {
            totalTransactions += block.tx_hashes.length + 1;  // +1 for coinbase transaction
        } else {
            totalTransactions += (block.transactions ? block.transactions.length : 0) + 1;
        }
    }
    
    const timeDiff = endBlock.block_header.timestamp - startBlock.block_header.timestamp;
    if (timeDiff === 0) return 0;  // Avoid division by zero
    return totalTransactions / timeDiff;
}

async function getCurrentHeight(nodeUrl) {
    const payload = {
        jsonrpc: "2.0",
        id: "0",
        method: "get_block_count",
        params: {}
    };
    const response = await axios.post(nodeUrl, payload);
    return response.data.result.count - 1;  // Subtract 1 because heights are 0-indexed
}

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/monero-tps', (req, res) => {
    res.render('monero_tps');
});

app.get('/get-monero-tps', async (req, res) => {
    try {
        const nodeUrl = await getWorkingNode();
        const currentHeight = await getCurrentHeight(nodeUrl);
        const startHeight = currentHeight - 99;
        const endHeight = currentHeight;
        const currentTPS = await calculateTPS(startHeight, endHeight, nodeUrl);
        const recentHistoricalTPS = await getMostRecentTPS();
        
        res.json({ 
            currentTPS: currentTPS,
            recentHistoricalTPS: recentHistoricalTPS
        });
    } catch (error) {
        console.error(`Error calculating TPS: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});
app.get('/get-historical-tps', async (req, res) => {
    try {
        const historicalTPS = await DailyTPS.findAll({
            order: [['date', 'ASC']]
        });
        res.json(historicalTPS);
    } catch (error) {
        console.error(`Error fetching historical TPS: ${error.message}`);
        res.status(500).json({ error: "Unable to fetch historical TPS data. The data may not have been calculated yet." });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
