const coins = [
  {
    name: "Monero (XMR)",
    coinGeckoId: "monero",
    avgTPS: 4.5,
    peakTPS: 10,
    topTPSSource: "https://www.crypto51.app/",
    maxSupply: "Infinite",
    emissionSchedule: "Tail emission",
    consensus: "RandomX (PoW)",
    lastUpdate: "2024-07-16",
    blockchain: "c++",
    blockchainSrc: "https://github.com/monero-project/monero",
    smartContracts: false,
    notes: "Monero uses RingCT and stealth addresses for enhanced privacy."
  },
  {
    name: "Zcash (ZEC)",
    coinGeckoId: "zcash",
    avgTPS: 6,
    peakTPS: 27,
    topTPSSource: "https://messari.io/asset/zcash/metrics/network-activity",
    maxSupply: "21 million",
    emissionSchedule: "Halving every 4 years",
    consensus: "Equihash (PoW)",
    lastUpdate: "2024-07-23",
    blockchain: "c++",
    blockchainSrc: "https://github.com/zcash/zcash",
    smartContracts: false,
    notes: "Zcash offers optional privacy using zk-SNARKs for shielded transactions."
  },
  {
    name: "Dash (DASH)",
    coinGeckoId: "dash",
    avgTPS: 15,
    peakTPS: 56,
    topTPSSource: "https://docs.dash.org/en/stable/introduction/features.html#instant-transactions-instantsend",
    maxSupply: "18.9 million",
    emissionSchedule: "Halving every 4 years",
    consensus: "X11 (PoW)",
    lastUpdate: "2024-07-30",
    blockchain: "c++",
    blockchainSrc: "https://github.com/dashpay/dash",
    smartContracts: false,
    notes: "Dash uses PrivateSend for transaction privacy."
  },
  {
    name: "Verge (XVG)",
    coinGeckoId: "verge",
    avgTPS: 100,
    peakTPS: 2000,
    topTPSSource: "https://vergecurrency.com/static/blackpaper/verge-blackpaper-v5.0.pdf",
    maxSupply: "16.5 billion",
    emissionSchedule: "Fixed supply",
    consensus: "Multiple Algorithms (PoW)",
    lastUpdate: "2024-07-08",
    blockchain: "c++",
    blockchainSrc: "https://github.com/vergecurrency/verge",
    smartContracts: false,
    notes: "Verge uses multiple anonymity-centric networks such as Tor and I2P."
  },
  {
    name: "PIVX (PIVX)",
    coinGeckoId: "pivx",
    avgTPS: 60,
    peakTPS: 173,
    topTPSSource: "https://pivx.org/",
    maxSupply: "Infinite",
    emissionSchedule: "Variable block rewards",
    consensus: "Quark (PoS)",
    lastUpdate: "2024-07-29",
    blockchain: "c++",
    blockchainSrc: "https://github.com/PIVX-Project/PIVX",
    smartContracts: false,
    notes: "PIVX uses zk-SNARKs and other privacy techniques for enhanced privacy."
  },
  {
    name: "NavCoin (NAV)",
    coinGeckoId: "nav-coin",
    avgTPS: 20,
    peakTPS: 1120,
    topTPSSource: "https://navcoin.org/en/roadmap/",
    maxSupply: "Infinite",
    emissionSchedule: "Inflationary",
    consensus: "PoS",
    lastUpdate: "2023-10-06",
    blockchain: "c++",
    blockchainSrc: "https://github.com/navcoin/navcoin-core",
    smartContracts: false,
    notes: "NavCoin offers dual blockchain and optional privacy with NavTech."
  },
];

const headers = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'currentPrice', label: 'Current Price', sortable: true },
  { key: 'marketCap', label: 'Market Cap', sortable: true },
  { key: 'currentSupply', label: 'Current Supply', sortable: true },
  { key: 'avgTPS', label: 'Avg TPS', sortable: true },
  { key: 'peakTPS', label: 'Peak TPS', sortable: true },
  { key: 'maxSupply', label: 'Max Supply', sortable: true },
  { key: 'emissionSchedule', label: 'Emission Schedule', sortable: true },
  { key: 'consensus', label: 'Consensus', sortable: true },
  { key: 'lastUpdate', label: 'Last Update', sortable: true },
  { key: 'blockchain', label: 'Blockchain', sortable: true },
  { key: 'smartContracts', label: 'Smart Contracts', sortable: true },
  { key: 'notes', label: 'Notes', sortable: false }
];
async function fetchCoinData(coinIds) {
  const ids = coinIds.join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false&locale=en&fields=id,current_price,market_cap,circulating_supply,total_supply`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data from CoinGecko:', error);
    return [];
  }
}
async function updateCoinsWithMarketData() {
  const coinIds = coins.map(coin => coin.coinGeckoId);
  const coinData = await fetchCoinData(coinIds);
  
  coins.forEach(coin => {
    const geckoData = coinData.find(data => data.id === coin.coinGeckoId);
    if (geckoData) {
      coin.currentPrice = geckoData.current_price;
      coin.currentSupply = geckoData.circulating_supply;
      coin.marketCap = geckoData.market_cap;
      coin.maxSupply = geckoData.total_supply;
    }
  });

  displayCoins(); // Update the table after fetching data
}

function displayTableHeaders() {
  const tableHead = document.querySelector('#coin-table thead');
  tableHead.innerHTML = `
    <tr>
      ${headers.map(header => `
        <th ${header.sortable ? `data-sort="${header.key}"` : ''}>${header.label}</th>
      `).join('')}
    </tr>
  `;
}
function formatLargeNumber(num) {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}function displayCoins() {
  const tableBody = document.querySelector('#coin-table tbody');
  let tpsSources = [];
  
  tableBody.innerHTML = coins.map((coin, index) => `
    <tr>
      ${headers.map(header => {
        if (header.key === 'blockchain') {
          return `<td><a href="${coin.blockchainSrc}" target="_blank">${coin[header.key]}</a></td>`;
        } else if (header.key === 'smartContracts') {
          return `<td>${coin[header.key] ? 'Yes' : 'No'}</td>`;
        } else if (header.key === 'maxSupply') {
          return `<td>${coin[header.key] === null ? 'Infinite' : formatLargeNumber(coin[header.key])}</td>`;
        } else if (header.key === 'currentPrice') {
          return `<td>${coin[header.key] ? '$' + coin[header.key].toFixed(2) : 'Loading...'}</td>`;
        } else if (header.key === 'currentSupply') {
          return `<td>${coin[header.key] ? formatLargeNumber(coin[header.key]) : 'Loading...'}</td>`;
        } else if (header.key === 'marketCap') {
          return `<td>${coin[header.key] ? '$' + formatLargeNumber(coin[header.key]) : 'Loading...'}</td>`;
        } else if (header.key === 'peakTPS') {
          tpsSources.push(`[${index + 1}] ${coin.name} Peak TPS: <a href="${coin.topTPSSource}" target="_blank">${coin.topTPSSource}</a>`);
          return `<td>${coin[header.key] || 'N/A'}<sup>[${index + 1}]</sup></td>`;
        } else {
          return `<td>${coin[header.key] || 'N/A'}</td>`;
        }
      }).join('')}
    </tr>
  `).join('');

  const sourcesSection = document.getElementById('sources');
  sourcesSection.innerHTML = `<h3>Sources:</h3>${tpsSources.join('<br>')}`;
}
function sortTable(column) {
  const dataType = ['name', 'consensus', 'lastUpdate', 'blockchain', 'notes', 'emissionSchedule'].includes(column) ? 'string' : 'number';
  const direction = this.asc ? 1 : -1;
  
  coins.sort((a, b) => {
    let comparison;
    if (dataType === 'string') {
      comparison = a[column].localeCompare(b[column]);
    } else if (column === 'theoreticalTPS') {
      // Special handling for theoreticalTPS range
      const [aMin] = a[column].split(' - ').map(Number);
      const [bMin] = b[column].split(' - ').map(Number);
      comparison = aMin - bMin;
    } else if (column === 'smartContracts') {
      comparison = (a[column] === b[column]) ? 0 : a[column] ? -1 : 1;
    } else if (column === 'maxSupply' || column === 'currentPrice' || column === 'currentSupply' || column === 'marketCap') {
      // Handle potential null values
      if (a[column] === null && b[column] === null) return 0;
      if (a[column] === null) return 1;
      if (b[column] === null) return -1;
      return a[column] - b[column];
    } else {
      comparison = a[column] - b[column];
    }
    return direction * comparison;
  });

  this.asc = !this.asc;
  displayCoins();
}
// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  displayTableHeaders();
  displayCoins(); // Display the table immediately with available data

  // Fetch and update with CoinGecko data
  await updateCoinsWithMarketData();

  const headerElements = document.querySelectorAll('#coin-table th[data-sort]');
  headerElements.forEach(header => {
    header.addEventListener('click', function() {
      const column = this.dataset.sort;
      sortTable.call(this, column);
    });
  });
  const lastUpdated = document.getElementById('last-updated');
  const mostRecentUpdate = coins.reduce((latest, coin) => {
    return new Date(coin.lastUpdate) > new Date(latest) ? coin.lastUpdate : latest;
  }, coins[0].lastUpdate);
  lastUpdated.textContent = mostRecentUpdate;
});