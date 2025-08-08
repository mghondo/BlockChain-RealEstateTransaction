// RealEstate.js - This file contains tests for the RealEstate and Escrow smart contracts using Hardhat and Chai.
const { expect } = require('chai'); // Imports the 'expect' function from Chai for assertions in tests.
const { ethers } = require('hardhat'); // Imports the ethers library from Hardhat for interacting with Ethereum contracts.

// Helper function to convert a number to wei units (in ether) for easier testing
const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether'); // Converts the input number to a string and parses it into ether units.
};

describe('RealEstate', () => { // Starts a Mocha test suite for the RealEstate and Escrow contracts.
    let realEstate, escrow; // Declares variables to hold instances of the RealEstate and Escrow contracts.
    let deployer, seller, buyer, inspector, lender; // Declares variables for different accounts: deployer (also seller), buyer, inspector, and lender.
    let nftID = 1; // Sets the NFT ID to 1, representing the real estate token.
    let purchasePrice = tokens(100); // Sets the purchase price to 100 ether for the property.
    let escrowAmount = tokens(20); // Sets the earnest money deposit to 20 ether.

    beforeEach(async () => { // Runs before each test to set up the environment.
        // Setup accounts
        const accounts = await ethers.getSigners(); // Retrieves the list of signers (accounts) from Hardhat.
        deployer = accounts[0]; // Assigns the first account as the deployer.
        seller = deployer; // Sets the seller to be the same as the deployer.
        buyer = accounts[1]; // Assigns the second account as the buyer.
        inspector = accounts[2]; // Assigns the third account as the inspector.
        lender = accounts[3]; // Assigns the fourth account as the lender.

        // Load contracts
        const RealEstate = await ethers.getContractFactory('RealEstate'); // Loads the RealEstate contract factory.
        const Escrow = await ethers.getContractFactory('Escrow'); // Loads the Escrow contract factory.

        // Deploy contracts
        realEstate = await RealEstate.deploy(); // Deploys the RealEstate contract.
        escrow = await Escrow.deploy( // Deploys the Escrow contract with specified parameters.
            realEstate.address, // Address of the RealEstate contract.
            nftID, // NFT ID for the property.
            purchasePrice, // Full purchase price (100 ETH).
            escrowAmount, // Earnest money amount (20 ETH).
            seller.address, // Seller's address.
            buyer.address, // Buyer's address.
            inspector.address, // Inspector's address.
            lender.address // Lender's address.
        );

        await realEstate.deployed(); // Waits for the RealEstate contract to be deployed.
        await escrow.deployed(); // Waits for the Escrow contract to be deployed.

        // Mint an NFT to the seller
        await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"); // Mints an NFT with a specific URI to the seller.

        // Seller approves the escrow contract to transfer the NFT
        let transaction = await realEstate.connect(seller).approve(escrow.address, nftID); // Approves the Escrow contract to transfer the NFT on behalf of the seller.
        await transaction.wait(); // Waits for the approval transaction to be mined.
    });

    describe('Deployment', () => { // Tests deployment-related functionality.
        it('deploys RealEstate contract successfully', async () => { // Verifies that the RealEstate contract deploys with a valid address.
            expect(realEstate.address).to.be.properAddress; // Asserts the RealEstate contract has a proper Ethereum address.
        });

        it('deploys Escrow contract successfully', async () => { // Verifies that the Escrow contract deploys with a valid address.
            expect(escrow.address).to.be.properAddress; // Asserts the Escrow contract has a proper Ethereum address.
        });

        it('sends an NFT to the seller/deployer', async () => { // Verifies that the minted NFT is owned by the seller.
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address); // Asserts the seller owns the NFT with the specified ID.
        });

        it('initializes Escrow contract in Created phase', async () => { // Verifies the Escrow contract starts in the Created phase (id 0).
            expect((await escrow.currentPhase()).id).to.equal(0); // Asserts the phase ID is 0 (Created).
        });
    });

    describe('Selling real estate', () => { // Tests the real estate sale process.
        let balance, transaction; // Declares variables for balance and transaction tracking.

        it('executes a successful transaction', async () => { // Tests a complete, successful sale following the required sequence.
            // Verify initial state
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address); // Confirms the seller owns the NFT before the sale.
            expect((await escrow.currentPhase()).id).to.equal(0); // Confirms the contract starts in Created phase.

            // Step 1: Buyer deposits earnest money
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount }); // Buyer deposits 20 ETH as earnest money.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Buyer deposits earnest money");
            expect((await escrow.currentPhase()).id).to.equal(1); // Verifies phase advances to EarnestDeposited (1).
            balance = await escrow.getBalance(); // Checks the escrow contract balance.
            expect(balance).to.equal(escrowAmount); // Asserts the balance is 20 ETH.
            console.log("Escrow balance after earnest deposit:", ethers.utils.formatEther(balance));

            // Step 2: Inspector updates inspection status
            transaction = await escrow.connect(inspector).updateInspectionStatus(true); // Inspector sets inspectionPassed to true.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Inspector updates status");
            expect(await escrow.inspectionPassed()).to.equal(true); // Verifies inspection passed.

            // Step 3: Approvals by all parties
            transaction = await escrow.connect(buyer).approveByRole("buyer"); // Buyer approves the sale.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Buyer approves sale");
            expect(await escrow.approvals(buyer.address)).to.equal(true); // Verifies buyer approval.

            transaction = await escrow.connect(seller).approveByRole("seller"); // Seller approves the sale.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Seller approves sale");
            expect(await escrow.approvals(seller.address)).to.equal(true); // Verifies seller approval.

            transaction = await escrow.connect(lender).approveByRole("lender"); // Lender approves the sale.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Lender approves sale");
            expect(await escrow.approvals(lender.address)).to.equal(true); // Verifies lender approval.
            expect((await escrow.currentPhase()).id).to.equal(2); // Verifies phase advances to Approved (2).

            // Step 4: Lender deposits remaining funds
            const remainingAmount = purchasePrice.sub(escrowAmount); // Calculates remaining amount (100 - 20 = 80 ETH).
            transaction = await escrow.connect(lender).depositFullPrice({ value: remainingAmount }); // Lender deposits 80 ETH.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Lender deposits remaining full price");
            balance = await escrow.getBalance(); // Checks the escrow contract balance.
            expect(balance).to.equal(purchasePrice); // Asserts the balance is 100 ETH.
            console.log("Escrow balance after full deposit:", ethers.utils.formatEther(balance));
            expect((await escrow.currentPhase()).id).to.equal(3); // Verifies phase advances to FullyFunded (3).

            // Step 5: Buyer finalizes the sale
            const sellerInitialBalance = await ethers.provider.getBalance(seller.address); // Records seller's initial balance.
            transaction = await escrow.connect(buyer).finalizeSale(); // Buyer finalizes the sale, transferring NFT and funds.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Buyer finalizes sale");

            // Verify outcomes
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address); // Asserts the buyer now owns the NFT.
            expect((await escrow.currentPhase()).id).to.equal(4); // Verifies phase advances to Completed (4).
            balance = await ethers.provider.getBalance(seller.address); // Checks seller's final balance.
            expect(balance).to.be.above(sellerInitialBalance); // Asserts seller received funds (exact amount depends on test account balance).
            console.log("Seller balance after sale:", ethers.utils.formatEther(balance));
            expect(await escrow.getBalance()).to.equal(0); // Asserts escrow balance is 0 after funds are transferred.
        });

        it('cancels transaction if inspection fails', async () => { // Tests cancellation when inspection fails, refunding buyer.
            // Buyer deposits earnest money
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount }); // Buyer deposits 20 ETH.
            await transaction.wait(); // Waits for the transaction to be mined.
            expect((await escrow.currentPhase()).id).to.equal(1); // Verifies phase advances to EarnestDeposited.

            // Inspector sets inspection to failed
            transaction = await escrow.connect(inspector).updateInspectionStatus(false); // Inspection fails.
            await transaction.wait(); // Waits for the transaction to be mined.
            expect(await escrow.inspectionPassed()).to.equal(false); // Verifies inspection failed.

            // Buyer cancels the sale
            const buyerInitialBalance = await ethers.provider.getBalance(buyer.address); // Records buyer's initial balance.
            transaction = await escrow.connect(buyer).cancelSale(); // Buyer cancels, expecting refund.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Buyer cancels sale due to failed inspection");

            // Verify outcomes
            expect((await escrow.currentPhase()).id).to.equal(5); // Verifies phase advances to Cancelled (5).
            balance = await ethers.provider.getBalance(buyer.address); // Checks buyer's final balance.
            expect(balance).to.be.above(buyerInitialBalance); // Asserts buyer received refund (accounting for gas).
            expect(await escrow.getBalance()).to.equal(0); // Asserts escrow balance is 0 after refund.
        });

        it('cancels transaction after inspection passes', async () => { // Tests cancellation after inspection passes, forfeiting to seller.
            // Buyer deposits earnest money
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount }); // Buyer deposits 20 ETH.
            await transaction.wait(); // Waits for the transaction to be mined.
            expect((await escrow.currentPhase()).id).to.equal(1); // Verifies phase advances to EarnestDeposited.

            // Inspector sets inspection to passed
            transaction = await escrow.connect(inspector).updateInspectionStatus(true); // Inspection passes.
            await transaction.wait(); // Waits for the transaction to be mined.
            expect(await escrow.inspectionPassed()).to.equal(true); // Verifies inspection passed.

            // Buyer cancels the sale
            const sellerInitialBalance = await ethers.provider.getBalance(seller.address); // Records seller's initial balance.
            transaction = await escrow.connect(buyer).cancelSale(); // Buyer cancels, expecting forfeiture to seller.
            await transaction.wait(); // Waits for the transaction to be mined.
            console.log("Buyer cancels sale after inspection passed");

            // Verify outcomes
            expect((await escrow.currentPhase()).id).to.equal(5); // Verifies phase advances to Cancelled (5).
            balance = await ethers.provider.getBalance(seller.address); // Checks seller's final balance.
            expect(balance).to.be.above(sellerInitialBalance); // Asserts seller received earnest money.
            expect(await escrow.getBalance()).to.equal(0); // Asserts escrow balance is 0 after forfeiture.
        });
    });
});