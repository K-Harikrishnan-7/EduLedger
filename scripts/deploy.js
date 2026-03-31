import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const networkName = hre.network.name;

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Network:", networkName);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Deploy UniversityRegistry
    console.log("\n📋 Deploying UniversityRegistry...");
    const UniversityRegistry = await hre.ethers.getContractFactory("UniversityRegistry");
    const registry = await UniversityRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ UniversityRegistry deployed to:", registryAddress);

    // Deploy AcademicCredentialSBT
    console.log("\n🎓 Deploying AcademicCredentialSBT...");
    const AcademicCredentialSBT = await hre.ethers.getContractFactory("AcademicCredentialSBT");
    const credentialSBT = await AcademicCredentialSBT.deploy(registryAddress);
    await credentialSBT.waitForDeployment();
    const credentialSBTAddress = await credentialSBT.getAddress();
    console.log("✅ AcademicCredentialSBT deployed to:", credentialSBTAddress);

    // Deploy ConsentManager
    console.log("\n🤝 Deploying ConsentManager...");
    const ConsentManager = await hre.ethers.getContractFactory("ConsentManager");
    const consentManager = await ConsentManager.deploy();
    await consentManager.waitForDeployment();
    const consentManagerAddress = await consentManager.getAddress();
    console.log("✅ ConsentManager deployed to:", consentManagerAddress);

    // ── Hardhat-only: register a test university using the second local signer ──
    if (networkName === "hardhat" || networkName === "localhost") {
        const [, universityAccount] = await hre.ethers.getSigners();
        console.log("\n🏫 Registering test university (Hardhat only)...");
        const tx = await registry.registerUniversity(
            universityAccount.address,
            "Rajalakshmi Engineering College"
        );
        await tx.wait();
        console.log("✅ University registered. Wallet:", universityAccount.address);
    } else {
        console.log("\n⚠️  Sepolia deploy: university must self-register via the app frontend.");
        console.log("   Go to the app → login as university → 'Register University' (or call registerUniversity() separately).");
    }

    // Save addresses to src/contracts/addresses.json
    const addressesPath = path.join(__dirname, "../src/contracts/addresses.json");

    let existingAddresses = {};
    if (fs.existsSync(addressesPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    }

    existingAddresses[networkName] = {
        UniversityRegistry: registryAddress,
        AcademicCredentialSBT: credentialSBTAddress,
        ConsentManager: consentManagerAddress,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(addressesPath, JSON.stringify(existingAddresses, null, 2));
    console.log("\n📁 Contract addresses saved to src/contracts/addresses.json");

    console.log("\n🎉 Deployment complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Network              :", networkName);
    console.log("UniversityRegistry   :", registryAddress);
    console.log("AcademicCredentialSBT:", credentialSBTAddress);
    console.log("ConsentManager       :", consentManagerAddress);
    console.log("Deployer wallet      :", deployer.address);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
