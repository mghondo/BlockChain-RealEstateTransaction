// Filename: EscrowWithStableAndYield.sol
// This file defines an advanced escrow contract that manages real estate transactions using USDC stablecoin and earns yield via Aave v3 integration.
// It supports fractional ownership through ERC-1155 NFTs, handling multiple buyers with proportional deposits, inspections, approvals, and yield distribution upon finalization or cancellation.
// Revised: Adjusted cancelSale logic to prevent seller from retaining earnest money when backing out (always refunds if seller calls), while buyers forfeit if backing out after inspection passes.

pragma solidity ^0.8.0; // Sets the Solidity compiler version to 0.8.0 or higher for compatibility and security features.
import '@openzeppelin/contracts/security/ReentrancyGuard.sol'; // Imports ReentrancyGuard from OpenZeppelin to prevent reentrancy attacks in functions dealing with external calls.
import '@openzeppelin/contracts/token/ERC20/IERC20.sol'; // Imports the IERC20 interface for interacting with ERC-20 tokens like USDC.
interface IPool {
  // Defines an interface for Aave's Pool contract to handle supply and withdraw operations.
  function supply(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external; // Function signature for supplying assets to Aave's pool.
  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external returns (uint256); // Function signature for withdrawing assets from Aave's pool.
}
interface IAaveToken {
  // Defines an interface for Aave's yield-bearing token (e.g., aUSDC) to check balances.
  function balanceOf(address account) external view returns (uint256); // Function signature to get the balance of the yield-bearing token.
}
interface IERC1155 {
  // Defines an interface for ERC-1155 tokens to handle multi-token transfers and approvals.
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes calldata data
  ) external; // Function signature for safely transferring multiple tokens.
  function setApprovalForAll(address operator, bool approved) external; // Function signature to approve or revoke an operator for all tokens.
}
// Declares the contract inheriting ReentrancyGuard for security.
contract EscrowWithStableAndYield is ReentrancyGuard {
  // Group variables into a struct to reduce stack usage  // Comment explaining the purpose of the Config struct.
  struct Config { // Defines a struct to hold configuration variables, reducing local variable usage in functions.
    address nftAddress; // Address of the ERC-1155 NFT contract representing properties.
    uint256 nftID; // ID of the NFT for the specific property.
    uint256 purchasePrice; // Total purchase price in USDC units (6 decimals).
    uint256 escrowAmount; // Earnest money deposit required in USDC units.
    address payable seller; // Seller's address for receiving funds.
    address inspector; // Inspector's address for updating inspection status.
    address lender; // Lender's address for funding the remaining amount.
    IERC20 usdc; // Interface for the USDC ERC-20 token.
    IPool aavePool; // Interface for Aave's lending pool.
    address aUsdc; // Address of Aave's yield-bearing USDC token.
  }
  Config public config; // Removed immutable to fix error  // Public storage variable for the config struct, set in constructor.
  address[] public buyers; // Array of buyer addresses for multi-buyer support.
  mapping(address => uint256) public buyerShares; // Mapping of buyer addresses to their share counts (total 100).
  mapping(address => uint256) public buyerEarnestDeposited; // Mapping of buyer addresses to their deposited earnest amounts.
  uint256 public totalEarnestDeposited; // Total earnest money deposited across all buyers.
  uint256 public lenderDeposited; // Amount deposited by the lender for the remaining purchase price.
  error Unauthorized(string role); // Custom error for unauthorized role access.
  error InvalidPhase(uint8 requiredPhase, uint8 currentPhase); // Custom error for invalid transaction phase.
  error InsufficientDeposit(uint256 required, uint256 provided); // Custom error for insufficient funds deposited.
  error InspectionNotPassed(); // Custom error if inspection has not passed.
  error NotAllApproved(); // Custom error if not all parties have approved.
  error TransferFailed(); // Custom error for failed token transfers.
  error InvalidShares(); // Custom error for invalid share allocations.
  struct Phase { // Struct to track the current transaction phase and timestamp.
    uint8 id; // Phase ID (0: Created, 1: EarnestDeposited, 2: Approved, 3: FullyFunded, 4: Completed, 5: Cancelled).
    uint256 timestamp; // Timestamp when the phase was entered.
  }
  Phase public currentPhase = Phase(0, block.timestamp); // Initializes the current phase to Created with current timestamp.
  mapping(address => bool) public approvals; // Mapping to track approval status of each party (buyer(s), seller, lender).
  bool public inspectionPassed; // Boolean flag indicating if the inspection has passed.
  event EarnestMoneyDeposited(
    address indexed buyer,
    uint256 amount,
    uint256 timestamp
  ); // Event emitted when earnest money is deposited.
  event InspectionStatusUpdated(
    address indexed inspector,
    bool passed,
    uint256 timestamp
  ); // Event emitted when inspection status is updated.
  event ApprovalGranted(
    address indexed approver,
    string role,
    uint256 timestamp
  ); // Event emitted when a party approves.
  event FullPriceFunded(
    address indexed funder,
    uint256 amount,
    uint256 timestamp
  ); // Event emitted when full price is funded.
  event TransactionFinalized(
    address indexed seller,
    uint256 amount,
    uint256 timestamp
  ); // Event emitted when the sale is finalized.
  event TransactionCancelled(
    bool inspectionFailed,
    uint256 refundedAmount,
    address indexed recipient,
    uint256 timestamp
  ); // Event emitted when the transaction is cancelled.
  event YieldEarned(uint256 amount, uint256 timestamp); // Event emitted for yield earned from Aave.
  event BuyersInitialized(
    address[] buyers,
    uint256[] shares,
    uint256 timestamp
  ); // Event emitted when buyers are initialized.
  constructor(
    // Constructor to initialize the escrow configuration.
    address _nftAddress, // Parameter for NFT contract address.
    uint256 _nftID, // Parameter for NFT ID.
    uint256 _purchasePrice, // Parameter for purchase price.
    uint256 _escrowAmount, // Parameter for escrow amount.
    address payable _seller, // Parameter for seller address.
    address _inspector, // Parameter for inspector address.
    address _lender, // Parameter for lender address.
    address _usdc, // Parameter for USDC token address.
    address _aavePool, // Parameter for Aave pool address.
    address _aUsdc // Parameter for Aave USDC token address.
  ) {
    config = Config({// Assigns values to the config struct.


      nftAddress: _nftAddress,
      nftID: _nftID,
      purchasePrice: _purchasePrice,
      escrowAmount: _escrowAmount,
      seller: _seller,
      inspector: _inspector,
      lender: _lender,
      usdc: IERC20(_usdc),
      aavePool: IPool(_aavePool),
      aUsdc: _aUsdc
    });
  }
  modifier onlyRole(string memory _role) {
    // Modifier to restrict access based on role.
    bytes32 roleHash = keccak256(abi.encodePacked(_role)); // Computes hash of the role string.
    if (
      roleHash == keccak256(abi.encodePacked('buyer')) && !isBuyer(msg.sender)
    ) revert Unauthorized('buyer'); // Checks for buyer role.
    if (
      roleHash == keccak256(abi.encodePacked('seller')) &&
      msg.sender != config.seller
    ) revert Unauthorized('seller'); // Checks for seller role.
    if (
      roleHash == keccak256(abi.encodePacked('inspector')) &&
      msg.sender != config.inspector
    ) revert Unauthorized('inspector'); // Checks for inspector role.
    if (
      roleHash == keccak256(abi.encodePacked('lender')) &&
      msg.sender != config.lender
    ) revert Unauthorized('lender'); // Checks for lender role.
    _; // Proceeds if authorized.
  }
  function isBuyer(address _addr) internal view returns (bool) {
    // Internal function to check if address is a buyer.
    for (uint i = 0; i < buyers.length; i++) {
      // Loops through buyers array.
      if (buyers[i] == _addr) return true; // Returns true if match found.
    }
    return false; // Returns false if not found.
  }
  modifier atPhase(uint8 _phase) {
    // Modifier to restrict to a specific phase.
    if (currentPhase.id != _phase) revert InvalidPhase(_phase, currentPhase.id); // Reverts if not in required phase.
    _; // Proceeds if in correct phase.
  }
  function initializeBuyers(
    address[] memory _buyers,
    uint256[] memory _shares
  ) external onlyRole('seller') atPhase(0) {
    // Function to initialize buyers in phase 0, seller only.
    if (_buyers.length != _shares.length || _buyers.length == 0)
      revert InvalidShares(); // Reverts if invalid input.
    uint256 totalShares = 0; // Initializes total shares counter.
    for (uint i = 0; i < _buyers.length; i++) {
      // Loops through buyers.
      buyers.push(_buyers[i]); // Adds buyer to array.
      buyerShares[_buyers[i]] = _shares[i]; // Sets shares for buyer.
      totalShares += _shares[i]; // Accumulates total shares.
    }
    if (totalShares != 100) revert InvalidShares(); // Reverts if total not 100.
    emit BuyersInitialized(_buyers, _shares, block.timestamp); // Emits initialization event.
  }
  function depositEarnest(
    uint256 _amount
  ) external onlyRole('buyer') atPhase(0) {
    // Function for buyers to deposit earnest in phase 0.
    uint256 required = (config.escrowAmount * buyerShares[msg.sender]) / 100; // Calculates required amount based on shares.
    if (_amount != required) revert InsufficientDeposit(required, _amount); // Reverts if amount doesn't match.
    if (!config.usdc.transferFrom(msg.sender, address(this), _amount))
      revert TransferFailed(); // Transfers USDC from buyer.
    config.usdc.approve(address(config.aavePool), _amount); // Approves Aave pool for amount.
    config.aavePool.supply(address(config.usdc), _amount, address(this), 0); // Supplies to Aave.
    buyerEarnestDeposited[msg.sender] += _amount; // Records buyer's deposit.
    totalEarnestDeposited += _amount; // Updates total deposited.
    emit EarnestMoneyDeposited(msg.sender, _amount, block.timestamp); // Emits deposit event.
    if (totalEarnestDeposited == config.escrowAmount) {
      // If all deposited.
      currentPhase = Phase(1, block.timestamp); // Advances to EarnestDeposited phase.
    }
  }
  function updateInspectionStatus(
    bool _passed
  ) external onlyRole('inspector') atPhase(1) {
    // Function for inspector to update status in phase 1.
    inspectionPassed = _passed; // Sets inspection flag.
    emit InspectionStatusUpdated(msg.sender, _passed, block.timestamp); // Emits update event.
  }
  function approveByRole(
    string memory _role
  ) external onlyRole(_role) atPhase(1) {
    // Function for parties to approve in phase 1.
    approvals[msg.sender] = true; // Sets approval for caller.
    emit ApprovalGranted(msg.sender, _role, block.timestamp); // Emits approval event.
    bool allApproved = approvals[config.seller] && approvals[config.lender]; // Checks seller and lender approved.
    for (uint i = 0; i < buyers.length; i++) {
      // Loops through buyers.
      allApproved = allApproved && approvals[buyers[i]]; // Checks all buyers have approved.
    }
    if (allApproved) {
      // If all approved.
      currentPhase = Phase(2, block.timestamp); // Advances to Approved phase.
    }
  }
  function depositFullPrice(
    uint256 _amount
  ) external onlyRole('lender') atPhase(2) {
    // Function for lender to deposit remaining funds in phase 2.
    uint256 required = config.purchasePrice - config.escrowAmount; // Calculates required remaining amount.
    if (_amount != required) revert InsufficientDeposit(required, _amount); // Reverts if amount doesn't match.
    if (!config.usdc.transferFrom(msg.sender, address(this), _amount))
      revert TransferFailed(); // Transfers USDC from lender.
    config.usdc.approve(address(config.aavePool), _amount); // Approves Aave pool.
    config.aavePool.supply(address(config.usdc), _amount, address(this), 0); // Supplies to Aave.
    lenderDeposited = _amount; // Records lender's deposit.
    emit FullPriceFunded(msg.sender, _amount, block.timestamp); // Emits funding event.
    currentPhase = Phase(3, block.timestamp); // Advances to FullyFunded phase.
  }
  function finalizeSale() external nonReentrant atPhase(3) {
    // Function to finalize sale in phase 3, protected against reentrancy.
    if (!inspectionPassed) revert InspectionNotPassed(); // Reverts if inspection failed.
    bool allApproved = approvals[config.seller] && approvals[config.lender]; // Checks seller and lender approvals.
    for (uint i = 0; i < buyers.length; i++) {
      // Loops through buyers.
      allApproved = allApproved && approvals[buyers[i]]; // Ensures all buyers approved.
    }
    if (!allApproved) revert NotAllApproved(); // Reverts if not all approved.
    uint256 totalBalance = getBalance(); // Gets current balance including yield.
    if (totalBalance < config.purchasePrice)
      revert InsufficientDeposit(config.purchasePrice, totalBalance); // Reverts if insufficient.
    config.aavePool.withdraw(
      address(config.usdc),
      type(uint256).max,
      address(this)
    ); // Withdraws all from Aave.
    if (!config.usdc.transfer(config.seller, totalBalance))
      revert TransferFailed(); // Transfers all to seller.
    IERC1155 nft = IERC1155(config.nftAddress); // Instantiates NFT interface.
    for (uint i = 0; i < buyers.length; i++) {
      // Loops through buyers.
      nft.safeTransferFrom(
        config.seller,
        buyers[i],
        config.nftID,
        buyerShares[buyers[i]],
        ''
      ); // Transfers shares to buyer.
    }
    currentPhase = Phase(4, block.timestamp); // Advances to Completed phase.
    emit TransactionFinalized(config.seller, totalBalance, block.timestamp); // Emits finalization event.
    uint256 yield = totalBalance > config.purchasePrice
      ? totalBalance - config.purchasePrice
      : 0; // Calculates yield.
    emit YieldEarned(yield, block.timestamp); // Emits yield event.
  }
  function cancelSale() external nonReentrant {
    // Function to cancel the sale, protected against reentrancy.
    if (currentPhase.id == 4 || currentPhase.id == 5)
      revert InvalidPhase(3, currentPhase.id); // Reverts if already completed or cancelled.
    uint256 totalBalance = getBalance(); // Gets current balance.
    uint256 totalDeposited = totalEarnestDeposited + lenderDeposited; // Calculates total principal deposited.
    uint256 yield = totalBalance > totalDeposited
      ? totalBalance - totalDeposited
      : 0; // Calculates yield.
    config.aavePool.withdraw(
      address(config.usdc),
      type(uint256).max,
      address(this)
    ); // Withdraws all from Aave.
    bool isSellerBackingOut = (msg.sender == config.seller);
    if (isSellerBackingOut || !inspectionPassed) {
      // If seller is backing out or inspection failed, refund to buyers/lender.
      bool inspectionFailedForEvent = !isSellerBackingOut && !inspectionPassed; // Set event flag: true only if not seller and inspection failed.
      for (uint i = 0; i < buyers.length; i++) {
        // Loops through buyers.
        address buyerAddr = buyers[i]; // Gets buyer address.
        uint256 buyerPrincipal = buyerEarnestDeposited[buyerAddr]; // Gets buyer's principal.
        uint256 buyerYield = totalDeposited == 0
          ? 0
          : (yield * buyerPrincipal) / totalDeposited; // Calculates buyer's yield share.
        if (!config.usdc.transfer(buyerAddr, buyerPrincipal + buyerYield))
          revert TransferFailed(); // Refunds to buyer.
        emit TransactionCancelled(
          inspectionFailedForEvent,
          buyerPrincipal + buyerYield,
          buyerAddr,
          block.timestamp
        ); // Emits per buyer.
      }
      if (lenderDeposited > 0) {
        // If lender deposited.
        uint256 lenderYield = totalDeposited == 0
          ? 0
          : (yield * lenderDeposited) / totalDeposited; // Calculates lender's yield.
        if (!config.usdc.transfer(config.lender, lenderDeposited + lenderYield))
          revert TransferFailed(); // Refunds to lender.
        emit TransactionCancelled(
          inspectionFailedForEvent,
          lenderDeposited + lenderYield,
          config.lender,
          block.timestamp
        ); // Emits for lender.
      }
    } else {
      // Otherwise (non-seller caller and inspection passed), forfeit all to seller.
      if (!config.usdc.transfer(config.seller, totalBalance))
        revert TransferFailed(); // Forfeits all to seller.
      emit TransactionCancelled(
        false,
        totalBalance,
        config.seller,
        block.timestamp
      ); // Emits cancellation event.
    }
    currentPhase = Phase(5, block.timestamp); // Advances to Cancelled phase.
  }
  function getBalance() public view returns (uint256) {
    // View function to get the current balance including yield from Aave.
    return IAaveToken(config.aUsdc).balanceOf(address(this)); // Returns the balance of the yield-bearing token.
  }
}
// Thorough Explanation:
// EscrowWithStableAndYield.sol is an advanced escrow contract that facilitates real estate transactions using USDC stablecoin and
//Aave for yield earning. It supports fractional ownership via ERC-1155 NFTs, allowing multiple buyers to purchase shares of a property.
//The contract manages a structured process with phases: earnest deposit, inspection, approvals, full funding, finalization, and cancellation.
//Deposits are supplied to Aave to accrue yield, which is distributed based on transaction outcome. Custom errors and modifiers ensure security and
//role-based access, while events provide transparency for off-chain tracking.
// The constructor initializes configuration variables in a struct to optimize stack usage, and buyer setup is handled separately in
// initializeBuyers to reduce complexity. Functions like depositEarnest and depositFullPrice handle proportional contributions and Aave interactions.
//FinalizeSale transfers funds to the seller and shares to buyers if conditions are met, emitting yield earned. CancelSale refunds or forfeits funds
//with proportional yield, depending on inspection status. This design mitigates volatility with USDC and adds value through yield.
// For production, audits are recommended due to integrations with Aave and ERC-1155. Extensions could include time-locks or oracle-based pricing.
//The contract builds on basic escrow patterns, enhancing them for fractional, yield-bearing real estate tokenization, suitable for retail
// platforms like RealT. It ensures trustless execution with role restrictions and phase enforcement, making it robust for multi-party transactions.4.3s
