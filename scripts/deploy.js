// scripts/deploy.js
const { ethers } = require('hardhat');

async function main() {
    const [deployer, buyer, inspector, lender] = await ethers.getSigners();
    const nftID = 1;
    const purchasePrice = ethers.utils.parseUnits("100000", 6); // $100,000 in USDC
    const escrowAmount = ethers.utils.parseUnits("20000", 6); // $20,000 in USDC

    // Deploy RealEstate
    const RealEstate = await ethers.getContractFactory('RealEstate');
    const realEstate = await RealEstate.deploy();
    await realEstate.deployed();
    console.log("RealEstate deployed to:", realEstate.address);

    // Mint NFT
    await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
    await realEstate.approve(realEstate.address, nftID);

    // Deploy EscrowWithStableAndYield
    const Escrow = await ethers.getContractFactory('EscrowWithStableAndYield');
    const escrow = await Escrow.deploy(
        realEstate.address,
        nftID,
        purchasePrice,
        escrowAmount,
        deployer.address, // Seller
        buyer.address,
        inspector.address,
        lender.address,
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC mainnet
        "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4e2", // Aave v3 Pool mainnet
        "0x98C23E9d8f34FEFb1B7BD6a91DeB971b0f2dD032" // aUSDC mainnet
    );
    await escrow.deployed();
    console.log("EscrowWithStableAndYield deployed to:", escrow.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });