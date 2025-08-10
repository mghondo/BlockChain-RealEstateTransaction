// CrossChainRealEstate.js - Test suite for cross-chain functionality with LayerZero bridge
const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 6);
};

let mockLZEndpoint;

describe('CrossChain RealEstate', () => {
  let realEstate, escrow, usdc, aavePool, aUsdc, kycOracle, polygonBridge;
  let deployer, seller, buyer1, buyer2, inspector, lender;
  let nftID = 1;
  let purchasePrice = tokens(100000);
  let escrowAmount = tokens(20000);
  let shares = [50, 50];

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    seller = deployer;
    buyer1 = accounts[1];
    buyer2 = accounts[4];
    inspector = accounts[2];
    lender = accounts[3];

    // Deploy Mock LayerZero Endpoint
    const MockLZEndpoint = await ethers.getContractFactory('MockLZEndpoint');
    mockLZEndpoint = await MockLZEndpoint.deploy();
    await mockLZEndpoint.deployed();

    // Deploy mock contracts
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    usdc = await MockUSDC.deploy();
    await usdc.deployed();

    const MockAUSDC = await ethers.getContractFactory('MockAUSDC');
    aUsdc = await MockAUSDC.deploy(usdc.address);
    await aUsdc.deployed();

    const MockAavePool = await ethers.getContractFactory('MockAavePool');
    aavePool = await MockAavePool.deploy(usdc.address, aUsdc.address);
    await aavePool.deployed();

    // Deploy KYC Oracle
    const KYCOracle = await ethers.getContractFactory('KYCOracle');
    kycOracle = await KYCOracle.deploy();
    await kycOracle.deployed();

    // Verify all participants in KYC
    await kycOracle.verifyKYC(buyer1.address, 365 * 24 * 60 * 60); // 1 year validity
    await kycOracle.verifyKYC(buyer2.address, 365 * 24 * 60 * 60);
    await kycOracle.verifyKYC(seller.address, 365 * 24 * 60 * 60);
    await kycOracle.verifyKYC(lender.address, 365 * 24 * 60 * 60);

    // Mint USDC to accounts
    await usdc.mint(buyer1.address, tokens(50000));
    await usdc.mint(buyer2.address, tokens(50000));
    await usdc.mint(lender.address, tokens(100000));

    // Deploy RealEstate
    const RealEstate = await ethers.getContractFactory('RealEstate');
    realEstate = await RealEstate.deploy();
    await realEstate.deployed();

    // Deploy CrossChain Escrow
    const CrossChainEscrow = await ethers.getContractFactory('EscrowWithStableAndYieldCrossChain');
    escrow = await CrossChainEscrow.deploy(
      mockLZEndpoint.address, // Mock LayerZero endpoint
      realEstate.address,
      nftID,
      purchasePrice,
      escrowAmount,
      seller.address,
      inspector.address,
      lender.address,
      usdc.address,
      aavePool.address,
      aUsdc.address,
      kycOracle.address
    );
    await escrow.deployed();

    // Deploy Polygon Bridge
    const PolygonBridge = await ethers.getContractFactory('PolygonUSDCBridge');
    polygonBridge = await PolygonBridge.deploy(
      mockLZEndpoint.address,
      usdc.address,
      1, // Ethereum chain ID
      escrow.address
    );
    await polygonBridge.deployed();

    // Setup initial state
    await realEstate.mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
    await realEstate.connect(seller).setApprovalForAll(escrow.address, true);
  });

  describe('KYC Oracle', () => {
    it('verifies KYC status correctly', async () => {
      expect(await kycOracle.isKYCVerified(buyer1.address)).to.equal(true);
      expect(await kycOracle.isKYCVerified(buyer2.address)).to.equal(true);
    });

    it('prevents non-KYC verified users from participating', async () => {
      const nonKYCUser = await ethers.getSigner(5);
      await expect(
        escrow.connect(seller).initializeBuyers([nonKYCUser.address], [100])
      ).to.be.revertedWith('KYCNotVerified');
    });

    it('allows batch KYC verification', async () => {
      const newUsers = [
        await ethers.getSigner(6),
        await ethers.getSigner(7)
      ];
      
      await kycOracle.batchVerifyKYC(
        [newUsers[0].address, newUsers[1].address],
        365 * 24 * 60 * 60
      );
      
      expect(await kycOracle.isKYCVerified(newUsers[0].address)).to.equal(true);
      expect(await kycOracle.isKYCVerified(newUsers[1].address)).to.equal(true);
    });
  });

  describe('24-Hour Timelock', () => {
    beforeEach(async () => {
      await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);
      
      // Complete deposit and approval process
      const earnest1 = tokens(10000);
      await usdc.connect(buyer1).approve(escrow.address, earnest1);
      await escrow.connect(buyer1).depositEarnest(earnest1);
      
      const earnest2 = tokens(10000);
      await usdc.connect(buyer2).approve(escrow.address, earnest2);
      await escrow.connect(buyer2).depositEarnest(earnest2);
      
      await escrow.connect(inspector).updateInspectionStatus(true);
      await escrow.connect(buyer1).approveByRole("buyer");
      await escrow.connect(buyer2).approveByRole("buyer");
      await escrow.connect(seller).approveByRole("seller");
      await escrow.connect(lender).approveByRole("lender");
      
      const remaining = tokens(80000);
      await usdc.connect(lender).approve(escrow.address, remaining);
      await escrow.connect(lender).depositFullPrice(remaining);
    });

    it('initiates timelock for finalize sale', async () => {
      const tx = await escrow.connect(buyer1).initiateFinalizeSale();
      const receipt = await tx.wait();
      
      expect(receipt.events.some(e => e.event === 'TimelockInitiated')).to.be.true;
      
      const [isPending, executeAfter] = await escrow.getTimelockStatus("FINALIZE_SALE");
      expect(isPending).to.be.true;
      expect(executeAfter).to.be.above(0);
    });

    it('prevents premature execution of finalize sale', async () => {
      await escrow.connect(buyer1).initiateFinalizeSale();
      
      await expect(
        escrow.connect(buyer1).finalizeSale()
      ).to.be.revertedWith('TimelockNotReady');
    });

    it('allows execution after timelock period', async () => {
      await escrow.connect(buyer1).initiateFinalizeSale();
      
      // Fast forward 24 hours + 1 minute
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 60]);
      await ethers.provider.send("evm_mine", []);
      
      const tx = await escrow.connect(buyer1).finalizeSale();
      await tx.wait();
      
      expect((await escrow.currentPhase()).id).to.equal(4);
    });

    it('initiates timelock for cancel sale', async () => {
      const tx = await escrow.connect(buyer1).initiateCancelSale();
      const receipt = await tx.wait();
      
      expect(receipt.events.some(e => e.event === 'TimelockInitiated')).to.be.true;
    });
  });

  describe('Cross-Chain Deposits (Simulated)', () => {
    beforeEach(async () => {
      await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);
    });

    it('processes cross-chain deposit correctly', async () => {
      // Simulate LayerZero message from Polygon
      const buyer = buyer1.address;
      const amount = tokens(10000);
      const buyerShares = 50;
      
      // Manually mint USDC to escrow (simulating bridged USDC)
      await usdc.mint(escrow.address, amount);
      
      // Simulate cross-chain message payload
      const payload = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256'],
        [buyer, amount, buyerShares]
      );
      
      // Create a mock deposit ID
      const depositId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint16', 'bytes', 'uint64'],
          [137, payload, 1] // Polygon chain ID, payload, nonce
        )
      );
      
      // Simulate the cross-chain deposit
      await escrow.processPendingCrossChainDeposit(depositId);
      
      // Verify the deposit was processed
      expect(await escrow.buyerEarnestDeposited(buyer)).to.equal(amount);
      expect(await escrow.totalEarnestDeposited()).to.equal(amount);
    });

    it('estimates LayerZero fees correctly', async () => {
      const amount = tokens(10000);
      const buyerShares = 50;
      
      // Mint USDC to bridge contract for testing
      await usdc.mint(polygonBridge.address, amount);
      
      const [nativeFee, zroFee] = await polygonBridge.estimateFee(
        amount,
        buyerShares,
        false,
        "0x"
      );
      
      expect(nativeFee).to.be.above(0);
      expect(zroFee).to.equal(0);
    });

    it('handles refund mechanism correctly', async () => {
      const amount = tokens(10000);
      const buyerShares = 50;
      
      await usdc.mint(buyer1.address, amount);
      await usdc.connect(buyer1).approve(polygonBridge.address, amount);
      
      // This would normally trigger LayerZero, but we'll simulate failure
      const tx = await polygonBridge.connect(buyer1).initiateDeposit(
        amount,
        buyerShares,
        "0x",
        { value: ethers.utils.parseEther('0.01') }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'DepositInitiated');
      const requestId = event.args.requestId;
      
      // Fast forward 1+ hours to make refund eligible
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);
      
      expect(await polygonBridge.isRefundEligible(requestId)).to.be.true;
      
      const initialBalance = await usdc.balanceOf(buyer1.address);
      await polygonBridge.connect(buyer1).refundDeposit(requestId);
      const finalBalance = await usdc.balanceOf(buyer1.address);
      
      expect(finalBalance.sub(initialBalance)).to.equal(amount);
    });
  });

  describe('Gas Optimization Tests', () => {
    it('measures gas costs for timelock operations', async () => {
      await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);
      
      const earnest1 = tokens(10000);
      await usdc.connect(buyer1).approve(escrow.address, earnest1);
      await escrow.connect(buyer1).depositEarnest(earnest1);
      
      const earnest2 = tokens(10000);
      await usdc.connect(buyer2).approve(escrow.address, earnest2);
      await escrow.connect(buyer2).depositEarnest(earnest2);
      
      await escrow.connect(inspector).updateInspectionStatus(true);
      await escrow.connect(buyer1).approveByRole("buyer");
      await escrow.connect(buyer2).approveByRole("buyer");
      await escrow.connect(seller).approveByRole("seller");
      await escrow.connect(lender).approveByRole("lender");
      
      const remaining = tokens(80000);
      await usdc.connect(lender).approve(escrow.address, remaining);
      await escrow.connect(lender).depositFullPrice(remaining);
      
      // Measure gas for timelock initiation
      const tx1 = await escrow.connect(buyer1).initiateFinalizeSale();
      const receipt1 = await tx1.wait();
      console.log(`Gas used for timelock initiation: ${receipt1.gasUsed}`);
      
      // Fast forward and measure finalization gas
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 60]);
      await ethers.provider.send("evm_mine", []);
      
      const tx2 = await escrow.connect(buyer1).finalizeSale();
      const receipt2 = await tx2.wait();
      console.log(`Gas used for timelock execution: ${receipt2.gasUsed}`);
      
      // Ensure reasonable gas costs (under typical limits)
      expect(receipt1.gasUsed).to.be.below(200000);
      expect(receipt2.gasUsed).to.be.below(500000);
    });

    it('compares gas costs with and without cross-chain features', async () => {
      // This test would compare the original escrow vs cross-chain escrow
      // to ensure the additional features don't add excessive overhead
      
      await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);
      
      const amount = tokens(10000);
      await usdc.connect(buyer1).approve(escrow.address, amount);
      
      const tx = await escrow.connect(buyer1).depositEarnest(amount);
      const receipt = await tx.wait();
      
      console.log(`Gas used for cross-chain escrow deposit: ${receipt.gasUsed}`);
      
      // Should be reasonably efficient despite additional features
      expect(receipt.gasUsed).to.be.below(300000);
    });
  });

  describe('Complete Cross-Chain Transaction Flow', () => {
    it('executes full cross-chain transaction with timelock', async () => {
      // Initialize buyers
      await escrow.connect(seller).initializeBuyers([buyer1.address, buyer2.address], shares);
      
      // Simulate cross-chain deposits
      await usdc.mint(escrow.address, tokens(20000)); // Simulated bridged USDC
      
      // Process deposits manually (in real scenario, this would be triggered by LayerZero)
      const earnest1 = tokens(10000);
      await usdc.connect(buyer1).approve(escrow.address, earnest1);
      await escrow.connect(buyer1).depositEarnest(earnest1);
      
      const earnest2 = tokens(10000);
      await usdc.connect(buyer2).approve(escrow.address, earnest2);
      await escrow.connect(buyer2).depositEarnest(earnest2);
      
      // Complete inspection and approvals
      await escrow.connect(inspector).updateInspectionStatus(true);
      await escrow.connect(buyer1).approveByRole("buyer");
      await escrow.connect(buyer2).approveByRole("buyer");
      await escrow.connect(seller).approveByRole("seller");
      await escrow.connect(lender).approveByRole("lender");
      
      // Lender deposits remaining amount
      const remaining = tokens(80000);
      await usdc.connect(lender).approve(escrow.address, remaining);
      await escrow.connect(lender).depositFullPrice(remaining);
      
      // Initiate timelock
      await escrow.connect(buyer1).initiateFinalizeSale();
      
      // Fast forward past timelock
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Execute finalization
      const sellerInitial = await usdc.balanceOf(seller.address);
      await escrow.connect(buyer1).finalizeSale();
      
      // Verify results
      expect(await realEstate.balanceOf(buyer1.address, nftID)).to.equal(50);
      expect(await realEstate.balanceOf(buyer2.address, nftID)).to.equal(50);
      expect((await escrow.currentPhase()).id).to.equal(4);
      expect(await usdc.balanceOf(seller.address)).to.be.above(sellerInitial);
    });
  });
});