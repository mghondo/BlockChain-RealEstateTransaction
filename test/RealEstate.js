// RealEstate.js - This file contains tests for the RealEstate and Escrow smart contracts using Hardhat and Chai.
const { expect } = require('chai'); // Imports the 'expect' function from Chai for assertions in tests.
const { ethers } = require('hardhat'); // Imports the ethers library from Hardhat for interacting with Ethereum contracts.

const tokens = (n) => { // Defines a helper function 'tokens' to convert a number to wei units using ethers.utils.parseUnits.
    return ethers.utils.parseUnits(n.toString(), 'ether'); // Converts the input number to a string and parses it into ether units.
};

describe('RealEstate', () => { // Starts a Mocha test suite for the RealEstate contract and related functionality.
    let realEstate, escrow; // Declares variables to hold instances of the RealEstate and Escrow contracts.
    let deployer, seller, buyer, inspector, lender; // Declares variables for different accounts: deployer (who is also the seller), buyer, inspector, and lender.
    let nftID = 1; // Sets the NFT ID to 1, which will be used for the real estate token.
    let purchasePrice = tokens(100); // Sets the purchase price to 100 ether using the tokens helper function.
    let escrowAmount = tokens(20); // Sets the escrow amount (earnest money) to 20 ether using the tokens helper function.

    beforeEach(async () => { // Defines a beforeEach hook that runs before each test to set up the environment.
        const accounts = await ethers.getSigners(); // Retrieves the list of signers (accounts) from ethers.
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
            realEstate.address, // Passes the address of the RealEstate contract.
            nftID, // Passes the NFT ID.
            purchasePrice, // Passes the purchase price.
            escrowAmount, // Passes the escrow amount.
            seller.address, // Passes the seller's address.
            buyer.address, // Passes the buyer's address.
            inspector.address, // Passes the inspector's address.
            lender.address // Passes the lender's address.
        );

        await realEstate.deployed(); // Waits for the RealEstate contract to be deployed.
        await escrow.deployed(); // Waits for the Escrow contract to be deployed.

        // Mint an NFT to the seller
        await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"); // Mints an NFT with a specific URI to the seller (deployer).
    });

    describe('Deployment', () => { // Starts a nested test suite for deployment-related tests.
        it('deploys RealEstate contract successfully', async () => { // Tests if the RealEstate contract deploys with a valid address.
            expect(realEstate.address).to.be.properAddress; // Asserts that the RealEstate contract has a proper Ethereum address.
        });

        it('deploys Escrow contract successfully', async () => { // Tests if the Escrow contract deploys with a valid address.
            expect(escrow.address).to.be.properAddress; // Asserts that the Escrow contract has a proper Ethereum address.
        });

        it('sends an NFT to the seller/deployer', async () => { // Tests if the minted NFT is owned by the seller.
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address); // Asserts that the owner of the NFT with nftID is the seller's address.
        });
    });

    describe('Selling real estate', () => { // Starts a nested test suite for selling real estate functionality.
        let balance, transaction; // Declares variables to hold balance and transaction objects.

        it('executes a successful transaction', async () => { // Tests the entire process of a successful real estate sale transaction.
            // Expect Seller to be the NFT owner before the sale
            expect(await realEstate.ownerOf(nftID)).to.equal(seller.address); // Asserts that the seller owns the NFT before the sale.

            // Buyer deposits earnest money
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount }); // Simulates the buyer depositing the escrow amount into the Escrow contract.
            // transaction = await escrow.connect(buyer).depositEarnest({ value: tokens(20) }); // Commented out alternative way to deposit earnest money.
            await transaction.wait(); // Waits for the deposit transaction to be mined.

            //check escrow balance
            balance = await escrow.getBalance(); // Retrieves the current balance of the Escrow contract.
            console.log("Escrow balance after deposit:", ethers.utils.formatEther(balance)); // Logs the escrow balance after deposit for debugging.

            // Seller approves the escrow contract to transfer the NFT
            await realEstate.connect(seller).approve(escrow.address, nftID); // Approves the Escrow contract to transfer the NFT on behalf of the seller.

            //Inspector updates inspection status
            transaction = await escrow.connect(inspector).updateInspectionStatus(true); // Simulates the inspector updating the inspection status to true (passed).
            await transaction.wait(); // Waits for the updateInspectionStatus transaction to be mined.
            console.log("Inspector updates inspection status"); // Logs a message indicating the inspector has done whatever

            // Buyer finalizes the sale
            transaction = await escrow.connect(buyer).finalizeSale(); // Simulates the buyer calling finalizeSale to complete the transaction.
            await transaction.wait(); // Waits for the finalizeSale transaction to be mined.
            console.log("Buyer finalizes sale"); // Logs a message indicating the buyer has finalized the sale.

            // Expect the buyer to be the new owner of the NFT
            expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address); // Asserts that the buyer now owns the NFT after the sale.
        });
    });
});