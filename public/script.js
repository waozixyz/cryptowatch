const coins = [
    { name: "Monero (XMR)", tps: 4.5, security: 5, privacy: 5, consensus: "RandomX (PoW)" },
    { name: "Zcash (ZEC)", tps: 27, security: 4, privacy: 5, consensus: "Equihash (PoW)" },
    { name: "Dash (DASH)", tps: 56, security: 4, privacy: 3, consensus: "X11 (PoW/PoS Hybrid)" },
    { name: "Grin", tps: 500, security: 3, privacy: 4, consensus: "Cuckoo Cycle (PoW)" },
    { name: "Beam", tps: 100, security: 4, privacy: 4, consensus: "BeamHash (PoW)" },
    { name: "Verge (XVG)", tps: 100, security: 3, privacy: 3, consensus: "Multi-algorithm (PoW)" },
    { name: "PIVX", tps: 60, security: 3, privacy: 4, consensus: "Proof of Stake (PoS)" },
    { name: "Horizen (ZEN)", tps: 26, security: 4, privacy: 4, consensus: "Equihash (PoW)" },
    { name: "NavCoin (NAV)", tps: 1120, security: 3, privacy: 3, consensus: "Proof of Stake (PoS)" },
    { name: "Particl (PART)", tps: 750, security: 4, privacy: 4, consensus: "Proof of Stake (PoS)" },
    { name: "Komodo (KMD)", tps: 100, security: 4, privacy: 3, consensus: "Delayed Proof of Work (dPoW)" },
    { name: "Bytecoin (BCN)", tps: 500, security: 3, privacy: 4, consensus: "CryptoNight (PoW)" },
    { name: "Firo (FIRO)", tps: 50, security: 4, privacy: 4, consensus: "MTP (PoW)" },
    { name: "DeepOnion (ONION)", tps: 200, security: 3, privacy: 4, consensus: "X13 (PoS/PoW Hybrid)" },
    { name: "Spectrecoin (XSPEC)", tps: 20, security: 3, privacy: 4, consensus: "Proof of Stake v3 (PoS)" },
    { name: "Enigma (ENG)", tps: 100, security: 3, privacy: 4, consensus: "Proof of Stake (PoS)" },
    { name: "Dusk Network (DUSK)", tps: 1000, security: 4, privacy: 5, consensus: "Segregated Byzantine Agreement" },
    { name: "Loki (OXEN)", tps: 100, security: 4, privacy: 4, consensus: "Proof of Service" },
    { name: "Pirate Chain (ARRR)", tps: 80, security: 4, privacy: 5, consensus: "Delayed Proof of Work (dPoW)" },
    { name: "Zano (ZANO)", tps: 1000, security: 3, privacy: 4, consensus: "ProgPowZ (PoW)" }
];

function displayCoins() {
    const tableBody = document.querySelector('#coin-table tbody');
    tableBody.innerHTML = coins.map(coin => `
        <tr>
            <td>${coin.name}</td>
            <td>${coin.tps}</td>
            <td><span class="rating">${"★".repeat(coin.security)}</span></td>
            <td><span class="rating">${"★".repeat(coin.privacy)}</span></td>
            <td>${coin.consensus}</td>
        </tr>
    `).join('');
}

function sortTable(column) {
    const dataType = column === 'name' || column === 'consensus' ? 'string' : 'number';
    const direction = this.asc ? 1 : -1;
    
    coins.sort((a, b) => {
        let comparison;
        if (dataType === 'string') {
            comparison = a[column].localeCompare(b[column]);
        } else if (column === 'security' || column === 'privacy') {
            comparison = a[column] - b[column];
        } else {
            comparison = parseFloat(a[column]) - parseFloat(b[column]);
        }
        return direction * comparison;
    });

    this.asc = !this.asc;
    displayCoins();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    displayCoins();

    const headers = document.querySelectorAll('#coin-table th');
    headers.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.dataset.sort;
            sortTable.call(this, column);
        });
    });
});