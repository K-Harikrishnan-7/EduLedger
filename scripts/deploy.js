import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function main() {
    const [deployer, universityAccount] = await hre.ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
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

    // Register test university (using the second signer)
    console.log("\n🏫 Registering test university: Rajalakshmi Engineering College...");
    const tx = await registry.registerUniversity(
        universityAccount.address,
        "Rajalakshmi Engineering College"
    );
    await tx.wait();
    console.log("✅ University registered. Wallet:", universityAccount.address);

    // Save addresses to src/contracts/addresses.json
    const networkName = hre.network.name;
    const addressesPath = path.join(__dirname, "../src/contracts/addresses.json");

    let existingAddresses = {};
    if (fs.existsSync(addressesPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    }

    existingAddresses[networkName] = {
        UniversityRegistry: registryAddress,
        AcademicCredentialSBT: credentialSBTAddress,
        ConsentManager: consentManagerAddress,
        testUniversityWallet: universityAccount.address,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(addressesPath, JSON.stringify(existingAddresses, null, 2));
    console.log("\n📁 Contract addresses saved to src/contracts/addresses.json");

    console.log("\n🎉 Deployment complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Network        :", networkName);
    console.log("UniversityRegistry   :", registryAddress);
    console.log("AcademicCredentialSBT:", credentialSBTAddress);
    console.log("ConsentManager       :", consentManagerAddress);
    console.log("Test University Wallet:", universityAccount.address);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
