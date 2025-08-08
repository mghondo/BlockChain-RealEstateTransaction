// Filename: RealEstate.js
// Description at the bottom of this file.

// npx hardhat compile
// npx hardhat test test/RealEstate.js
// npx hardhat test test/RealEstate.js --grep "Deployment" --network localhost

// RealEstate.js - Tests for RealEstate and EscrowWithStableAndYield contracts
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
        // Retrieves the list of signers (accounts) from Hardhat for testing.
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
        aUsdc = await MockAUSDC.deploy(usdc.address);
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

    describe('Selling real estate', () => {
        let balance, transaction;

        it('executes a successful transaction', async () => {
            console.log("Starting successful transaction test...");
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address);
            expect((await escrow.currentPhase()).id).to.equal(0);

            // Buyer approves USDC
            await usdc.connect(buyer).approve(escrow.address, escrowAmount);
            console.log("Buyer approved USDC");

            // Buyer deposits earnest money
            transaction = await escrow.connect(buyer).depositEarnest(escrowAmount);
            await transaction.wait();
            console.log("Buyer deposited earnest money");
            expect((await escrow.currentPhase()).id).to.equal(1);
            balance = await escrow.getBalance();
            expect(balance).to.be.at.least(escrowAmount); // Allow for yield
            console.log("Escrow balance after earnest:", ethers.utils.formatUnits(balance, 6));

            // Inspector updates status
            transaction = await escrow.connect(inspector).updateInspectionStatus(true);
            await transaction.wait();
            console.log("Inspector updated status");
            expect(await escrow.inspectionPassed()).to.equal(true);

            // Approvals
            transaction = await escrow.connect(buyer).approveByRole("buyer");
            await transaction.wait();
            console.log("Buyer approved sale");
            expect(await escrow.approvals(buyer.address)).to.equal(true);

            transaction = await escrow.connect(seller).approveByRole("seller");
            await transaction.wait();
            console.log("Seller approved sale");
            expect(await escrow.approvals(seller.address)).to.equal(true);

            transaction = await escrow.connect(lender).approveByRole("lender");
            await transaction.wait();
            console.log("Lender approved sale");
            expect(await escrow.approvals(lender.address)).to.equal(true);
            expect((await escrow.currentPhase()).id).to.equal(2);

            // Lender deposits remaining funds
            const remainingAmount = purchasePrice.sub(escrowAmount);
            await usdc.connect(lender).approve(escrow.address, remainingAmount);
            console.log("Lender approved USDC");
            transaction = await escrow.connect(lender).depositFullPrice(remainingAmount);
            await transaction.wait();
            console.log("Lender deposited remaining funds");
            balance = await escrow.getBalance();
            expect(balance).to.be.at.least(purchasePrice); // Allow for yield
            console.log("Escrow balance after full deposit:", ethers.utils.formatUnits(balance, 6));
            expect((await escrow.currentPhase()).id).to.equal(3);

            // Simulate 90 days for yield
            await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            // Finalize sale
            const sellerInitialBalance = await usdc.balanceOf(seller.address);
            transaction = await escrow.connect(buyer).finalizeSale();
            await transaction.wait();
            console.log("Buyer finalized sale");

            // Verify outcomes
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address);
            expect((await escrow.currentPhase()).id).to.equal(4);
            balance = await usdc.balanceOf(seller.address);
            expect(balance).to.be.above(sellerInitialBalance); // Allow for yield
            console.log("Seller balance after sale:", ethers.utils.formatUnits(balance, 6));
            expect(await escrow.getBalance()).to.equal(0);
        });

        it('cancels transaction if inspection fails', async () => {
            console.log("Starting cancellation if inspection fails test...");
            // Buyer approves USDC for earnest deposit
            await usdc.connect(buyer).approve(escrow.address, escrowAmount);
            console.log("Buyer approved USDC");
            transaction = await escrow.connect(buyer).depositEarnest(escrowAmount);
            await transaction.wait();
            console.log("Buyer deposited earnest money");
            expect((await escrow.currentPhase()).id).to.equal(1);

            transaction = await escrow.connect(inspector).updateInspectionStatus(false);
            await transaction.wait();
            console.log("Inspector set inspection to failed");
            expect(await escrow.inspectionPassed()).to.equal(false);

            // Simulate 90 days for yield
            await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            const buyerInitialBalance = await usdc.balanceOf(buyer.address);
            transaction = await escrow.connect(buyer).cancelSale();
            await transaction.wait();
            console.log("Buyer cancelled sale");

            expect((await escrow.currentPhase()).id).to.equal(5);
            balance = await usdc.balanceOf(buyer.address);
            expect(balance).to.be.above(buyerInitialBalance); // Allow for yield
            console.log("Buyer balance after cancellation:", ethers.utils.formatUnits(balance, 6));
            expect(await escrow.getBalance()).to.equal(0);
        });

        it('cancels transaction after inspection passes', async () => {
            console.log("Starting cancellation after inspection passes test...");
            // Buyer approves USDC for earnest deposit
            await usdc.connect(buyer).approve(escrow.address, escrowAmount);
            console.log("Buyer approved USDC");
            transaction = await escrow.connect(buyer).depositEarnest(escrowAmount);
            await transaction.wait();
            console.log("Buyer deposited earnest money");
            expect((await escrow.currentPhase()).id).to.equal(1);

            transaction = await escrow.connect(inspector).updateInspectionStatus(true);
            await transaction.wait();
            console.log("Inspector set inspection to passed");
            expect(await escrow.inspectionPassed()).to.equal(true);

            // Simulate 90 days for yield
            await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            const sellerInitialBalance = await usdc.balanceOf(seller.address);
            transaction = await escrow.connect(buyer).cancelSale();
            await transaction.wait();
            console.log("Buyer cancelled sale");

            expect((await escrow.currentPhase()).id).to.equal(5);
            balance = await usdc.balanceOf(seller.address);
            expect(balance).to.be.above(sellerInitialBalance); // Allow for yield
            console.log("Seller balance after cancellation:", ethers.utils.formatUnits(balance, 6));
            expect(await escrow.getBalance()).to.equal(0);
        });
    });
});

// Thorough Explanation:
// This file, RealEstate.js, serves as the test suite for the RealEstate NFT contract and the EscrowWithStableAndYield escrow contract using Hardhat and Chai. It sets up a testing environment with mock contracts for USDC and Aave to simulate stablecoin deposits and yield accrual without relying on mainnet. The `tokens` helper function converts human-readable numbers to USDC units with 6 decimals, ensuring accurate amount handling in tests. The `beforeEach` hook deploys all necessary contracts and initializes the test state, including minting USDC to participants and approving the NFT for the escrow.

// The 'Deployment' describe block tests basic deployment and initialization, verifying contract addresses, NFT ownership, and the escrow's starting phase. The 'Selling real estate' block tests core functionality: a successful transaction (deposit, inspection, approvals, full funding, yield simulation, and finalization with NFT transfer and funds payout), and two cancellation scenarios (refund to buyer if inspection fails, forfeiture to seller if passed, including yield). Console logs are added for debugging, tracing each step and logging addresses and balances.

// Overall, this test file ensures the escrow system works as expected with USDC stability and Aave yield, covering edge cases like cancellations and time-based interest. It's comprehensive for validating the contracts' logic before deployment, and the use of mocks makes it efficient for local development.