let coins = [];
let currentTab = 'general';

const tabConfigs = {
    general: [
        { key: 'name', label: 'Name' },
        { key: 'consensus', label: 'Consensus' },
        { key: 'blockchain', label: 'Blockchain' },
        { key: 'notes', label: 'Notes' }
    ],
    tps: [
        { key: 'name', label: 'Name' },
        { key: 'avgTPS', label: 'Avg TPS' },
        { key: 'peakTPS', label: 'Peak TPS' },
        { key: 'consensus', label: 'Consensus' }
    ],
    'smart-contracts': [
        { key: 'name', label: 'Name' },
        { key: 'smartContracts', label: 'Smart Contracts' },
        { key: 'notes', label: 'Notes' }
    ],
    specs: [
        { key: 'name', label: 'Name' },
        { key: 'currentPrice', label: 'Current Price' },
        { key: 'marketCap', label: 'Market Cap' },
        { key: 'currentSupply', label: 'Circulating Supply' },
        { key: 'maxSupply', label: 'Max Supply' }
    ],
    tokenomics: [
        { key: 'name', label: 'Name' },
        { key: 'emissionSchedule', label: 'Emission Schedule' },
        { key: 'tokenomicsNotes', label: 'Tokenomics Notes' }
    ]
};


async function fetchCoinData() {
    try {
        const response = await fetch('coins.json');
        coins = await response.json();
    } catch (error) {
        console.error('Error fetching coin data:', error);
        coins = [];
    }
}

async function fetchMarketData() {
    const ids = coins.map(coin => coin.coinGeckoId).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data from CoinGecko:', error);
        return [];
    }
}

function updateCoinsWithMarketData(marketData) {
  coins.forEach(coin => {
      const geckoData = marketData.find(data => data.id === coin.coinGeckoId);
      if (geckoData) {
          // Only update if the value doesn't exist in the original data
          if (coin.currentPrice === undefined) coin.currentPrice = geckoData.current_price;
          if (coin.currentSupply === undefined) coin.currentSupply = geckoData.circulating_supply;
          if (coin.marketCap === undefined) coin.marketCap = geckoData.market_cap;
          if (coin.maxSupply === undefined) coin.maxSupply = geckoData.total_supply;
      }
  });
}
function formatLargeNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
}

function displayTable() {
  const tableContainer = document.getElementById('table-container');
  const headers = tabConfigs[currentTab];
  
  let tableHTML = `
      <table>
          <thead>
              <tr>
                  ${headers.map(header => `<th data-sort="${header.key}">${header.label}</th>`).join('')}
              </tr>
          </thead>
          <tbody>
  `;

  let sources = [];

  coins.forEach((coin, index) => {
      tableHTML += '<tr>';
      headers.forEach(header => {
          let cellContent = coin[header.key];
          
          if (header.key === 'blockchain') {
              if (coin.blockchainSrc) {
                  sources.push(coin.blockchainSrc);
                  cellContent = `${cellContent}<sup>[${sources.length}]</sup>`;
              }
          } else if (header.key === 'smartContracts') {
              cellContent = coin[header.key] ? 'Yes' : 'No';
          } else if (header.key === 'currentPrice') {
              cellContent = coin[header.key] ? '$' + coin[header.key].toFixed(2) : 'Loading...';
          } else if (header.key === 'marketCap' || header.key === 'currentSupply') {
              cellContent = coin[header.key] ? formatLargeNumber(coin[header.key]) : 'Loading...';
          } else if (header.key === 'totalSupply' || header.key === 'maxSupply') {
            console.log(coin[header.key])
              cellContent = coin[header.key] === '∞' ? '∞' : (coin[header.key] ? formatLargeNumber(coin[header.key]) : 'N/A');
          }

          tableHTML += `<td>${cellContent}</td>`;
      });
      tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table>';
  tableContainer.innerHTML = tableHTML;

  // Update sources
  updateSources(sources);
}

function updateSources(sources) {
  const sourcesSection = document.getElementById('sources');
  
  if (sources.length > 0) {
      const sourcesList = sources.map((source, index) => 
          `<li id="ref-${index + 1}">[${index + 1}] <a href="${source}" target="_blank">${source}</a></li>`
      ).join('');
      sourcesSection.innerHTML = `<h3>Sources:</h3><ol>${sourcesList}</ol>`;
      sourcesSection.style.display = 'block';
  } else {
      sourcesSection.style.display = 'none';
  }
}

function sortTable(column) {
    const dataType = typeof coins[0][column];
    const direction = this.asc ? 1 : -1;
    
    coins.sort((a, b) => {
        if (dataType === 'string') {
            return direction * a[column].localeCompare(b[column]);
        } else if (column === 'smartContracts') {
            return direction * ((a[column] === b[column]) ? 0 : a[column] ? -1 : 1);
        } else {
            return direction * (a[column] - b[column]);
        }
    });

    this.asc = !this.asc;
    displayTable();
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
          document.querySelector('.tab-button.active').classList.remove('active');
          button.classList.add('active');
          currentTab = button.dataset.tab;
          displayTable();
      });
  });

  // Table sorting
  document.getElementById('table-container').addEventListener('click', event => {
      if (event.target.tagName === 'TH') {
          const column = event.target.dataset.sort;
          sortTable.call(event.target, column);
      }
  });

  // Source link clicking
  document.getElementById('table-container').addEventListener('click', event => {
      if (event.target.tagName === 'SUP') {
          const refNumber = event.target.textContent.replace('[', '').replace(']', '');
          const refElement = document.getElementById(`ref-${refNumber}`);
          if (refElement) {
              refElement.scrollIntoView({ behavior: 'smooth' });
          }
      }
  });
}

async function init() {
    await fetchCoinData();
    const marketData = await fetchMarketData();
    updateCoinsWithMarketData(marketData);
    displayTable();
    setupEventListeners();

    // Update last updated date
    const lastUpdated = document.getElementById('last-updated');
    const mostRecentUpdate = coins.reduce((latest, coin) => {
        return new Date(coin.lastUpdate) > new Date(latest) ? coin.lastUpdate : latest;
    }, coins[0].lastUpdate);
    lastUpdated.textContent = mostRecentUpdate;
}

document.addEventListener('DOMContentLoaded', init);