const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const BlueCarbonRegistry = await ethers.getContractFactory("BlueCarbonRegistry");
    const registry = await BlueCarbonRegistry.deploy();

    await registry.waitForDeployment();

    console.log("BlueCarbonRegistry deployed to:", await registry.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
