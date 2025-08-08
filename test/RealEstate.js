// RealEstate.js - Tests for RealEstate and EscrowWithStableAndYield contracts

// npx hardhat compile  
// npx hardhat test test/RealEstate.js
// npx hardhat test test/RealEstate.js --grep "Deployment" --network localhost

const { expect } = require('chai');
const { ethers } = require('hardhat');

// Helper for USDC amounts (6 decimals)
const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 6);
};

describe('RealEstate', () => {
    let realEstate, escrow, usdc, aavePool, aUsdc;
    let deployer, seller, buyer, inspector, lender;
    let nftID = 1;
    let purchasePrice = tokens(100000); // $100,000 in USDC
    let escrowAmount = tokens(20000); // $20,000 in USDC

    beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        seller = deployer;
        buyer = accounts[1];
        inspector = accounts[2];
        lender = accounts[3];

        console.log("Deploying MockUSDC...");
        const MockUSDC = await ethers.getContractFactory('MockUSDC');
        usdc = await MockUSDC.deploy();
        await usdc.deployed();
        console.log("MockUSDC deployed to:", usdc.address);

        console.log("Deploying MockAUSDC...");
        const MockAUSDC = await ethers.getContractFactory('MockAUSDC');
        aUsdc = await MockAUSDC.deploy(usdc.address); // FIXED: Pass usdc.address to constructor
        await aUsdc.deployed();
        console.log("MockAUSDC deployed to:", aUsdc.address);

        console.log("Deploying MockAavePool...");
        const MockAavePool = await ethers.getContractFactory('MockAavePool');
        aavePool = await MockAavePool.deploy(usdc.address, aUsdc.address);
        await aavePool.deployed();
        console.log("MockAavePool deployed to:", aavePool.address);

        // Mint USDC to buyer and lender
        await usdc.mint(buyer.address, tokens(100000));
        await usdc.mint(lender.address, tokens(100000));
        console.log("USDC minted to buyer and lender");

        // Deploy contracts
        console.log("Deploying RealEstate...");
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();
        await realEstate.deployed();
        console.log("RealEstate deployed to:", realEstate.address);

        console.log("Deploying EscrowWithStableAndYield...");
        const Escrow = await ethers.getContractFactory('EscrowWithStableAndYield');
        escrow = await Escrow.deploy(
            realEstate.address,
            nftID,
            purchasePrice,
            escrowAmount,
            seller.address,
            buyer.address,
            inspector.address,
            lender.address,
            usdc.address,
            aavePool.address,
            aUsdc.address
        );
        await escrow.deployed();
        console.log("EscrowWithStableAndYield deployed to:", escrow.address);

        // Mint NFT and approve
        await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
        await realEstate.connect(seller).approve(escrow.address, nftID);
        console.log("NFT minted and approved");
    });

    describe('Deployment', () => {
        it('deploys RealEstate contract successfully', async () => {
            expect(realEstate.address).to.be.properAddress;
        });

        it('deploys Escrow contract successfully', async () => {
            expect(escrow.address).to.be.properAddress;
        });

        it('sends an NFT to the seller/deployer', async () => {
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address);
        });

        it('initializes Escrow contract in Created phase', async () => {
            expect((await escrow.currentPhase()).id).to.equal(0);
        });
    });

    // Rest of the tests (successful transaction, cancellation if inspection fails, cancellation after inspection passes) remain the same as in your provided file
    // ... (omitted for brevity, but keep them as is)
});