import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Starting University Registration on Sepolia...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Read the deployed registry address from addresses.json
    const addressesPath = path.join(__dirname, "../src/contracts/addresses.json");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("addresses.json not found. Have you deployed?");
    }

    const allAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const networkName = hre.network.name;
    const registryAddress = allAddresses[networkName]?.UniversityRegistry;

    if (!registryAddress) {
        throw new Error(`UniversityRegistry address not found for network: ${networkName}`);
    }

    console.log("Connecting to UniversityRegistry at:", registryAddress);

    // Get the contract instance
    const UniversityRegistry = await hre.ethers.getContractFactory("UniversityRegistry");
    const registry = UniversityRegistry.attach(registryAddress);

    // Check if already registered
    const isVerified = await registry.isVerified(deployer.address);
    if (isVerified) {
        console.log(`✅ Wallet ${deployer.address} is already a verified university!`);
        return;
    }

    console.log("Registering university...");

    // Register the deployer wallet as the university
    const tx = await registry.registerUniversity(
        deployer.address,
        "Rajalakshmi Engineering College" // Using the same name from your local deploy script
    );

    console.log("Transaction sent. Waiting for confirmation...");
    console.log(`Tx Hash: ${tx.hash}`);

    await tx.wait();

    console.log("✅ Successfully registered university on-chain!");
    console.log("Wallet:", deployer.address);
    console.log("Name: Rajalakshmi Engineering College");
    console.log("-----------------------------------------");
    console.log("IMPORTANT: Make sure your PostgreSQL database has this wallet address");
    console.log("assigned to the university's 'wallet_address' column.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Registration failed:", error);
        process.exit(1);
    });
