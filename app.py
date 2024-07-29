from flask import Flask, render_template, jsonify
import requests
import json
import time
import random

app = Flask(__name__)

NODES = [
    "https://node.sethforprivacy.com:443",
    "http://nodes.hashvault.pro:18081",
    "http://node.c3pool.com:18081",
    "http://node.community.rino.io:18081",
    "http://node.moneroworld.com:18089",
    "http://xmr-node.cakewallet.com:18081"
]

def get_working_node():
    random.shuffle(NODES)
    for node in NODES:
        try:
            url = f"{node}/json_rpc"
            payload = {
                "jsonrpc": "2.0",
                "id": "0",
                "method": "get_info",
                "params": {}
            }
            response = requests.post(url, json=payload, timeout=5)
            if response.status_code == 200:
                print(f"Connected to node: {node}")
                return url
        except requests.exceptions.RequestException:
            print(f"Failed to connect to node: {node}")
    raise Exception("Failed to connect to any node")

def get_block(height, node_url):
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": "get_block",
        "params": {"height": height}
    }
    response = requests.post(node_url, json=payload)
    return response.json()['result']

def calculate_tps(start_height, end_height, node_url):
    start_block = get_block(start_height, node_url)
    end_block = get_block(end_height, node_url)
    
    total_transactions = 0
    for height in range(start_height, end_height + 1):
        block = get_block(height, node_url)
        # Check if 'tx_hashes' exists in the block data
        if 'tx_hashes' in block:
            total_transactions += len(block['tx_hashes']) + 1  # +1 for coinbase transaction
        else:
            # If 'tx_hashes' doesn't exist, try to get transaction count from 'transactions' field
            total_transactions += len(block.get('transactions', [])) + 1  # +1 for coinbase transaction
    
    time_diff = end_block['block_header']['timestamp'] - start_block['block_header']['timestamp']
    if time_diff == 0:
        return 0  # Avoid division by zero
    tps = total_transactions / time_diff
    
    return tps

def get_current_height(node_url):
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": "get_block_count",
        "params": {}
    }
    response = requests.post(node_url, json=payload)
    return response.json()['result']['count'] - 1  # Subtract 1 because heights are 0-indexed

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/monero-tps')
def monero_tps():
    return render_template('monero_tps.html')

@app.route('/get-monero-tps')
def get_monero_tps():
    try:
        node_url = get_working_node()
        current_height = get_current_height(node_url)
        start_height = current_height - 99
        end_height = current_height
        tps = calculate_tps(start_height, end_height, node_url)
        return jsonify({'tps': tps})
    except Exception as e:
        print(f"Error calculating TPS: {str(e)}")  # Log the error
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)