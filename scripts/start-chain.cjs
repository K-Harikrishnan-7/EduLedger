#!/usr/bin/env node
/**
 * start-chain.cjs
 * Starts Hardhat node then auto-deploys contracts after node is ready.
 */
const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');

// Start hardhat node
const node = spawn('npx', ['hardhat', 'node'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true
});

node.on('error', err => {
    console.error('Failed to start hardhat node:', err);
    process.exit(1);
});

const deploy = () => {
    exec('npx hardhat run scripts/deploy.js --network localhost', { cwd: ROOT }, (err, stdout, stderr) => {
        if (err) {
            console.error('\n❌ Auto-deploy failed:\n', stderr || err.message);
        } else {
            console.log('\n' + stdout);
            console.log('✅ Contracts deployed. Chain ready!\n');
        }
    });
};

const MAX_WAIT = 30000;
const POLL_INTERVAL = 1000;
let waited = 0;

const waitForRPC = () => {
    const req = http.request(
        { hostname: '127.0.0.1', port: 8545, method: 'POST', path: '/', headers: { 'Content-Type': 'application/json' } },
        () => {
            console.log('\n⛓  Hardhat node is up — deploying contracts...');
            deploy();
        }
    );
    req.on('error', () => {
        waited += POLL_INTERVAL;
        if (waited < MAX_WAIT) setTimeout(waitForRPC, POLL_INTERVAL);
        else console.error('Timed out waiting for Hardhat node.');
    });
    req.write(JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }));
    req.end();
};

// Give hardhat node 2 seconds to start before polling
setTimeout(waitForRPC, 2000);

process.on('SIGINT', () => { node.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { node.kill('SIGTERM'); process.exit(0); });
