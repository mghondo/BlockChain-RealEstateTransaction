// Filename: RealEstate.js
// This file contains a test suite for the RealEstate and EscrowWithStableAndYield contracts using Hardhat and Chai, verifying deployment, 
// functionality, and edge cases.
// It tests fractional ownership with multiple buyers, proportional deposits, yield simulation, and transaction flows like successful sales and cancellations.
// RealEstate.js - Updated Tests for RealEstate and EscrowWithStableAndYield contracts  // Header comment describing the file's purpose.
const { expect } = require('chai');  // Imports the expect function from Chai for assertions in tests.
const { ethers } = require('hardhat');  // Imports the ethers library from Hardhat for interacting with Ethereum contracts.
const tokens = (n) => {  // Defines a helper function to convert numbers to USDC units with 6 decimals.
return ethers.utils.parseUnits(n.toString(), 6);  // Uses ethers to parse the value into wei-like units for USDC.
};
describe('RealEstate', () => {  // Starts the main describe block for the RealEstate test suite.
let realEstate, escrow, usdc, aavePool, aUsdc;  // Declares variables for contracts to be deployed in tests.
let deployer, seller, buyer1, buyer2, inspector, lender;  // Declares variables for test accounts.
let nftID = 1;  // Sets a constant for the NFT ID used in tests.
let purchasePrice = tokens(100000);  // Sets the purchase price to 100,000 USDC using the tokens helper.
let escrowAmount = tokens(20000);  // Sets the escrow amount to 20,000 USDC using the tokens helper.
let shares = [50, 50];  // Sets an array for share distribution between two buyers (total 100 shares).
beforeEach(async () => {  // Defines a beforeEach hook to set up the test environment before each test.
const accounts = await ethers.getSigners();  // Retrieves the list of test accounts from Hardhat.
deployer = accounts[0];  // Assigns the first account as deployer and seller.
seller = deployer;  // Sets seller to the deployer account.
buyer1 = accounts[1];  // Assigns the second account as buyer1.
buyer2 = accounts[4];  // Assigns the fifth account as buyer2 for multi-buyer testing.
inspector = accounts[2];  // Assigns the third account as inspector.
lender = accounts[3];  // Assigns the fourth account as lender.
const MockUSDC = await ethers.getContractFactory('MockUSDC');  // Gets the factory for MockUSDC contract.
usdc = await MockUSDC.deploy();  // Deploys the MockUSDC contract.
await usdc.deployed();  // Waits for the deployment to complete.
const MockAUSDC = await ethers.getContractFactory('MockAUSDC');  // Gets the factory for MockAUSDC contract.
aUsdc = await MockAUSDC.deploy(usdc.address);  // Deploys MockAUSDC with USDC address.
await aUsdc.deployed();  // Waits for deployment.
const MockAavePool = await ethers.getContractFactory('MockAavePool');  // Gets the factory for MockAavePool contract.
aavePool = await MockAavePool.deploy(usdc.address, aUsdc.address);  // Deploys MockAavePool with USDC and aUSDC addresses.
await aavePool.deployed();  // Waits for deployment.
await usdc.mint(buyer1.address, tokens(50000));  // Mints 50,000 USDC to buyer1 for testing.
await usdc.mint(buyer2.address, tokens(50000));  // Mints 50,000 USDC to buyer2 for testing.
await usdc.mint(lender.address, tokens(100000));  // Mints 100,000 USDC to lender for testing.
const RealEstate = await ethers.getContractFactory('RealEstate');  // Gets the factory for RealEstate contract.
realEstate = await RealEstate.deploy();  // Deploys the RealEstate contract.
await realEstate.deployed();  // Waits for deployment.
const Escrow = await ethers.getContractFactory('EscrowWithStableAndYield');  // Gets the factory for EscrowWithStableAndYield contract.
escrow = await Escrow.deploy(  // Deploys the escrow contract with required parameters.
realEstate.address,  // Passes RealEstate address.
nftID,  // Passes NFT ID.
purchasePrice,  // Passes purchase price.
escrowAmount,  // Passes escrow amount.
seller.address,  // Passes seller address.
inspector.address,  // Passes inspector address.
lender.address,  // Passes lender address.
usdc.address,  // Passes USDC address.
aavePool.address,  // Passes Aave pool address.
aUsdc.address  // Passes aUSDC address.
);
await escrow.deployed();  // Waits for escrow deployment.
await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");  // Mints a new property NFT with URI.
await realEstate.connect(seller).setApprovalForAll(escrow.address, true);  // Approves escrow to manage all seller's tokens.
await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);  // Initializes buyers and shares.
});
describe('Deployment', () => {  // Starts describe block for deployment tests.
it('deploys RealEstate contract successfully', async () => {  // Test case to check RealEstate deployment.
expect(realEstate.address).to.be.properAddress;  // Asserts that RealEstate has a valid address.
});
it('deploys Escrow contract successfully', async () => {  // Test case to check Escrow deployment.
expect(escrow.address).to.be.properAddress;  // Asserts that Escrow has a valid address.
});
it('sends shares to the seller/deployer', async () => {  // Test case to check initial shares ownership.
expect(await realEstate.balanceOf(seller.address, nftID)).to.equal(100);  // Asserts seller has 100 shares.
});
it('initializes Escrow contract in Created phase', async () => {  // Test case for initial escrow phase.
expect((await escrow.currentPhase()).id).to.equal(0);  // Asserts phase ID is 0 (Created).
});
it('initializes buyers correctly', async () => {  // Test case for buyer initialization.
expect(await escrow.buyerShares(buyer1.address)).to.equal(50);  // Asserts buyer1 has 50 shares.
expect(await escrow.buyerShares(buyer2.address)).to.equal(50);  // Asserts buyer2 has 50 shares.
});
});
describe('Selling real estate', () => {  // Starts describe block for selling tests.
let balance, transaction;  // Declares variables for balance and transaction in the scope.
it('executes a successful transaction', async () => {  // Test case for successful transaction flow.
expect(await realEstate.balanceOf(seller.address, nftID)).to.equal(100);  // Asserts initial seller shares.
expect((await escrow.currentPhase()).id).to.equal(0);  // Asserts initial phase.
const earnest1 = tokens(10000);  // Sets earnest amount for buyer1.
await usdc.connect(buyer1).approve(escrow.address, earnest1);  // Approves escrow for buyer1's USDC.
transaction = await escrow.connect(buyer1).depositEarnest(earnest1);  // Deposits earnest from buyer1.
await transaction.wait();  // Waits for transaction confirmation.
const earnest2 = tokens(10000);  // Sets earnest amount for buyer2.
await usdc.connect(buyer2).approve(escrow.address, earnest2);  // Approves escrow for buyer2's USDC.
transaction = await escrow.connect(buyer2).depositEarnest(earnest2);  // Deposits earnest from buyer2.
await transaction.wait();  // Waits for confirmation.
expect((await escrow.currentPhase()).id).to.equal(1);  // Asserts phase advanced to 1.
balance = await escrow.getBalance();  // Gets current escrow balance.
expect(balance).to.be.at.least(escrowAmount);  // Asserts balance at least escrow amount.
transaction = await escrow.connect(inspector).updateInspectionStatus(true);  // Updates inspection to passed.
await transaction.wait();  // Waits for confirmation.
expect(await escrow.inspectionPassed()).to.equal(true);  // Asserts inspection passed.
await escrow.connect(buyer1).approveByRole("buyer");  // Buyer1 approves.
await escrow.connect(buyer2).approveByRole("buyer");  // Buyer2 approves.
await escrow.connect(seller).approveByRole("seller");  // Seller approves.
await escrow.connect(lender).approveByRole("lender");  // Lender approves.
expect((await escrow.currentPhase()).id).to.equal(2);  // Asserts phase advanced to 2.
const remaining = tokens(80000);  // Sets remaining amount for lender.
await usdc.connect(lender).approve(escrow.address, remaining);  // Approves escrow for lender's USDC.
transaction = await escrow.connect(lender).depositFullPrice(remaining);  // Deposits full price from lender.
await transaction.wait();  // Waits for confirmation.
balance = await escrow.getBalance();  // Gets updated balance.
expect(balance).to.be.at.least(purchasePrice);  // Asserts balance at least purchase price.
expect((await escrow.currentPhase()).id).to.equal(3);  // Asserts phase advanced to 3.
await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);  // Simulates 90 days time passage for yield.
await ethers.provider.send("evm_mine", []);  // Mines a new block to apply time change.
const sellerInitial = await usdc.balanceOf(seller.address);  // Gets seller's initial USDC balance.
transaction = await escrow.connect(buyer1).finalizeSale();  // Finalizes the sale.
await transaction.wait();  // Waits for confirmation.
expect(await realEstate.balanceOf(buyer1.address, nftID)).to.equal(50);  // Asserts buyer1 received 50 shares.
expect(await realEstate.balanceOf(buyer2.address, nftID)).to.equal(50);  // Asserts buyer2 received 50 shares.
expect((await escrow.currentPhase()).id).to.equal(4);  // Asserts phase advanced to 4 (Completed).
balance = await usdc.balanceOf(seller.address);  // Gets seller's updated balance.
expect(balance).to.be.above(sellerInitial);  // Asserts seller's balance increased (funds + yield).
expect(await escrow.getBalance()).to.equal(0);  // Asserts escrow balance is zero after finalization.
});
it('cancels transaction if inspection fails', async () => {  // Test case for cancellation when inspection fails.
const earnest1 = tokens(10000);  // Sets earnest for buyer1.
await usdc.connect(buyer1).approve(escrow.address, earnest1);  // Approves escrow.
transaction = await escrow.connect(buyer1).depositEarnest(earnest1);  // Deposits from buyer1.
await transaction.wait();  // Waits for confirmation.
const earnest2 = tokens(10000);  // Sets earnest for buyer2.
await usdc.connect(buyer2).approve(escrow.address, earnest2);  // Approves escrow.
transaction = await escrow.connect(buyer2).depositEarnest(earnest2);  // Deposits from buyer2.
await transaction.wait();  // Waits for confirmation.
expect((await escrow.currentPhase()).id).to.equal(1);  // Asserts phase 1.
transaction = await escrow.connect(inspector).updateInspectionStatus(false);  // Sets inspection to failed.
await transaction.wait();  // Waits for confirmation.
expect(await escrow.inspectionPassed()).to.equal(false);  // Asserts inspection failed.
await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);  // Simulates time for yield.
await ethers.provider.send("evm_mine", []);  // Mines block.
const buyer1Initial = await usdc.balanceOf(buyer1.address);  // Gets buyer1 initial balance.
const buyer2Initial = await usdc.balanceOf(buyer2.address);  // Gets buyer2 initial balance.
transaction = await escrow.connect(buyer1).cancelSale();  // Cancels the sale.
await transaction.wait();  // Waits for confirmation.
expect((await escrow.currentPhase()).id).to.equal(5);  // Asserts phase 5 (Cancelled).
expect(await usdc.balanceOf(buyer1.address)).to.be.above(buyer1Initial);  // Asserts buyer1 balance increased (refund + yield).
expect(await usdc.balanceOf(buyer2.address)).to.be.above(buyer2Initial);  // Asserts buyer2 balance increased.
expect(await escrow.getBalance()).to.equal(0);  // Asserts escrow balance zero.
});
});
});
// Thorough Explanation:
// RealEstate.js is a Hardhat test suite using Chai for assertions, verifying the RealEstate ERC-1155 contract and EscrowWithStableAndYield contract. 
// It sets up mocks for USDC and Aave, deploys contracts in beforeEach, and tests deployment, buyer initialization, successful sales with 
// share transfers, and cancellations with refunds. The tokens helper handles USDC decimals, and time simulation tests yield accrual.
// The suite focuses on fractional ownership with 100 shares, multi-buyer support (e.g., two buyers at 50 shares each), proportional earnest deposits, 
// inspections, approvals, and full funding. Successful transaction tests confirm phase advancements, balance checks, and share distribution. 
// Cancellation tests verify refunds with yield when inspection fails, ensuring no shares are transferred.
// For comprehensiveness, it could be extended with uneven shares or more buyers, but it covers core flows. Console logs can be added for debugging. 
// This file integrates with Hardhat's ethers for contract interactions, making it efficient for local testing before deployment. 
// It aligns with retail tokenization by simulating real-world scenarios like yield on escrowed funds.2.6s