require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
// Only use the key if it looks like a real 32-byte hex private key (64 hex chars)
const rawKey = process.env.PRIVATE_KEY || "";
const PRIVATE_KEY = rawKey.length === 64 ? [rawKey] : [];

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: PRIVATE_KEY,
            chainId: 11155111
        }
    },
    paths: {
        artifacts: "./src/contracts/artifacts"
    }
};
