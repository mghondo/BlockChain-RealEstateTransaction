// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './MockLZEndpoint.sol';
import './KYCOracle.sol';

interface IPool {
  function supply(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;
  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external returns (uint256);
}

interface IAaveToken {
  function balanceOf(address account) external view returns (uint256);
}

interface IERC1155 {
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes calldata data
  ) external;
  function setApprovalForAll(address operator, bool approved) external;
}

contract EscrowWithStableAndYieldCrossChain is ReentrancyGuard, NonblockingLzApp {
  struct Config {
    address nftAddress;
    uint256 nftID;
    uint256 purchasePrice;
    uint256 escrowAmount;
    address payable seller;
    address inspector;
    address lender;
    IERC20 usdc;
    IPool aavePool;
    address aUsdc;
    KYCOracle kycOracle;
  }
  
  ILayerZeroEndpoint public lzEndpointInterface;
  
  Config public config;
  address[] public buyers;
  mapping(address => uint256) public buyerShares;
  mapping(address => uint256) public buyerEarnestDeposited;
  uint256 public totalEarnestDeposited;
  uint256 public lenderDeposited;
  
  // Timelock state
  struct TimelockAction {
    uint256 executeAfter;
    bool isPending;
    bytes32 actionType;
  }
  
  mapping(bytes32 => TimelockAction) public timelockActions;
  uint256 public constant TIMELOCK_DELAY = 24 hours;
  
  // Cross-chain deposits
  struct CrossChainDeposit {
    address buyer;
    uint256 amount;
    uint256 shares;
    bool processed;
  }
  
  mapping(bytes32 => CrossChainDeposit) public crossChainDeposits;
  
  error Unauthorized(string role);
  error InvalidPhase(uint8 requiredPhase, uint8 currentPhase);
  error InsufficientDeposit(uint256 required, uint256 provided);
  error InspectionNotPassed();
  error NotAllApproved();
  error TransferFailed();
  error InvalidShares();
  error KYCNotVerified(address user);
  error TimelockNotReady(uint256 currentTime, uint256 executeAfter);
  error InvalidCrossChainDeposit();
  
  struct Phase {
    uint8 id;
    uint256 timestamp;
  }
  
  Phase public currentPhase = Phase(0, block.timestamp);
  mapping(address => bool) public approvals;
  bool public inspectionPassed;
  
  event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp);
  event CrossChainDepositReceived(address indexed buyer, uint256 amount, uint256 shares, bytes32 indexed depositId);
  event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp);
  event ApprovalGranted(address indexed approver, string role, uint256 timestamp);
  event FullPriceFunded(address indexed funder, uint256 amount, uint256 timestamp);
  event TransactionFinalized(address indexed seller, uint256 amount, uint256 timestamp);
  event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp);
  event YieldEarned(uint256 amount, uint256 timestamp);
  event BuyersInitialized(address[] buyers, uint256[] shares, uint256 timestamp);
  event TimelockInitiated(bytes32 indexed actionType, uint256 executeAfter);
  event TimelockExecuted(bytes32 indexed actionType, uint256 timestamp);
  
  constructor(
    address _lzEndpoint,
    address _nftAddress,
    uint256 _nftID,
    uint256 _purchasePrice,
    uint256 _escrowAmount,
    address payable _seller,
    address _inspector,
    address _lender,
    address _usdc,
    address _aavePool,
    address _aUsdc,
    address _kycOracle
  ) NonblockingLzApp(_lzEndpoint) {
    config = Config({
      nftAddress: _nftAddress,
      nftID: _nftID,
      purchasePrice: _purchasePrice,
      escrowAmount: _escrowAmount,
      seller: _seller,
      inspector: _inspector,
      lender: _lender,
      usdc: IERC20(_usdc),
      aavePool: IPool(_aavePool),
      aUsdc: _aUsdc,
      kycOracle: KYCOracle(_kycOracle)
    });
    lzEndpointInterface = ILayerZeroEndpoint(_lzEndpoint);
  }
  
  modifier onlyRole(string memory _role) {
    bytes32 roleHash = keccak256(abi.encodePacked(_role));
    if (roleHash == keccak256(abi.encodePacked('buyer')) && !isBuyer(msg.sender)) 
      revert Unauthorized('buyer');
    if (roleHash == keccak256(abi.encodePacked('seller')) && msg.sender != config.seller) 
      revert Unauthorized('seller');
    if (roleHash == keccak256(abi.encodePacked('inspector')) && msg.sender != config.inspector) 
      revert Unauthorized('inspector');
    if (roleHash == keccak256(abi.encodePacked('lender')) && msg.sender != config.lender) 
      revert Unauthorized('lender');
    _;
  }
  
  modifier onlyKYCVerified(address user) {
    if (!config.kycOracle.isKYCVerified(user)) {
      revert KYCNotVerified(user);
    }
    _;
  }
  
  modifier atPhase(uint8 _phase) {
    if (currentPhase.id != _phase) revert InvalidPhase(_phase, currentPhase.id);
    _;
  }
  
  modifier timelockReady(bytes32 actionType) {
    TimelockAction memory action = timelockActions[actionType];
    if (!action.isPending || block.timestamp < action.executeAfter) {
      revert TimelockNotReady(block.timestamp, action.executeAfter);
    }
    _;
  }
  
  function isBuyer(address _addr) internal view returns (bool) {
    for (uint i = 0; i < buyers.length; i++) {
      if (buyers[i] == _addr) return true;
    }
    return false;
  }
  
  function initializeBuyers(
    address[] memory _buyers,
    uint256[] memory _shares
  ) external onlyRole('seller') atPhase(0) {
    if (_buyers.length != _shares.length || _buyers.length == 0)
      revert InvalidShares();
    
    uint256 totalShares = 0;
    for (uint i = 0; i < _buyers.length; i++) {
      if (!config.kycOracle.isKYCVerified(_buyers[i])) {
        revert KYCNotVerified(_buyers[i]);
      }
      buyers.push(_buyers[i]);
      buyerShares[_buyers[i]] = _shares[i];
      totalShares += _shares[i];
    }
    
    if (totalShares != 100) revert InvalidShares();
    emit BuyersInitialized(_buyers, _shares, block.timestamp);
  }
  
  // LayerZero message handling for cross-chain deposits
  function _nonblockingLzReceive(
    uint16 _srcChainId,
    bytes memory _srcAddress,
    uint64 _nonce,
    bytes memory _payload
  ) internal override {
    (address buyer, uint256 amount, uint256 shares) = abi.decode(_payload, (address, uint256, uint256));
    
    bytes32 depositId = keccak256(abi.encodePacked(_srcChainId, _srcAddress, _nonce));
    
    crossChainDeposits[depositId] = CrossChainDeposit({
      buyer: buyer,
      amount: amount,
      shares: shares,
      processed: false
    });
    
    emit CrossChainDepositReceived(buyer, amount, shares, depositId);
    
    _processCrossChainDeposit(depositId);
  }
  
  function _processCrossChainDeposit(bytes32 depositId) internal {
    CrossChainDeposit storage deposit = crossChainDeposits[depositId];
    
    if (deposit.processed) return;
    
    if (!config.kycOracle.isKYCVerified(deposit.buyer)) {
      return; // Will be processed later when KYC is verified
    }
    
    if (currentPhase.id != 0) return; // Only process in initial phase
    
    uint256 required = (config.escrowAmount * deposit.shares) / 100;
    if (deposit.amount != required) return;
    
    // Assume USDC was bridged and is now available in this contract
    config.usdc.approve(address(config.aavePool), deposit.amount);
    config.aavePool.supply(address(config.usdc), deposit.amount, address(this), 0);
    
    if (!isBuyer(deposit.buyer)) {
      buyers.push(deposit.buyer);
      buyerShares[deposit.buyer] = deposit.shares;
    }
    
    buyerEarnestDeposited[deposit.buyer] += deposit.amount;
    totalEarnestDeposited += deposit.amount;
    deposit.processed = true;
    
    emit EarnestMoneyDeposited(deposit.buyer, deposit.amount, block.timestamp);
    
    if (totalEarnestDeposited == config.escrowAmount) {
      currentPhase = Phase(1, block.timestamp);
    }
  }
  
  function processPendingCrossChainDeposit(bytes32 depositId) external {
    _processCrossChainDeposit(depositId);
  }
  
  function depositEarnest(
    uint256 _amount
  ) external onlyRole('buyer') onlyKYCVerified(msg.sender) atPhase(0) {
    uint256 required = (config.escrowAmount * buyerShares[msg.sender]) / 100;
    if (_amount != required) revert InsufficientDeposit(required, _amount);
    
    if (!config.usdc.transferFrom(msg.sender, address(this), _amount))
      revert TransferFailed();
    
    config.usdc.approve(address(config.aavePool), _amount);
    config.aavePool.supply(address(config.usdc), _amount, address(this), 0);
    
    buyerEarnestDeposited[msg.sender] += _amount;
    totalEarnestDeposited += _amount;
    
    emit EarnestMoneyDeposited(msg.sender, _amount, block.timestamp);
    
    if (totalEarnestDeposited == config.escrowAmount) {
      currentPhase = Phase(1, block.timestamp);
    }
  }
  
  function updateInspectionStatus(
    bool _passed
  ) external onlyRole('inspector') atPhase(1) {
    inspectionPassed = _passed;
    emit InspectionStatusUpdated(msg.sender, _passed, block.timestamp);
  }
  
  function approveByRole(
    string memory _role
  ) external onlyRole(_role) atPhase(1) {
    approvals[msg.sender] = true;
    emit ApprovalGranted(msg.sender, _role, block.timestamp);
    
    bool allApproved = approvals[config.seller] && approvals[config.lender];
    for (uint i = 0; i < buyers.length; i++) {
      allApproved = allApproved && approvals[buyers[i]];
    }
    
    if (allApproved) {
      currentPhase = Phase(2, block.timestamp);
    }
  }
  
  function depositFullPrice(
    uint256 _amount
  ) external onlyRole('lender') onlyKYCVerified(msg.sender) atPhase(2) {
    uint256 required = config.purchasePrice - config.escrowAmount;
    if (_amount != required) revert InsufficientDeposit(required, _amount);
    
    if (!config.usdc.transferFrom(msg.sender, address(this), _amount))
      revert TransferFailed();
    
    config.usdc.approve(address(config.aavePool), _amount);
    config.aavePool.supply(address(config.usdc), _amount, address(this), 0);
    
    lenderDeposited = _amount;
    emit FullPriceFunded(msg.sender, _amount, block.timestamp);
    currentPhase = Phase(3, block.timestamp);
  }
  
  // Timelock functions
  function initiateFinalizeSale() external nonReentrant atPhase(3) {
    bytes32 actionType = keccak256(abi.encodePacked("FINALIZE_SALE"));
    
    timelockActions[actionType] = TimelockAction({
      executeAfter: block.timestamp + TIMELOCK_DELAY,
      isPending: true,
      actionType: actionType
    });
    
    emit TimelockInitiated(actionType, block.timestamp + TIMELOCK_DELAY);
  }
  
  function finalizeSale() external nonReentrant timelockReady(keccak256(abi.encodePacked("FINALIZE_SALE"))) {
    if (!inspectionPassed) revert InspectionNotPassed();
    
    bool allApproved = _checkAllApprovals();
    if (!allApproved) revert NotAllApproved();
    
    uint256 totalBalance = getBalance();
    if (totalBalance < config.purchasePrice)
      revert InsufficientDeposit(config.purchasePrice, totalBalance);
    
    _executeFinalization(totalBalance);
    
    // Clear timelock
    bytes32 actionType = keccak256(abi.encodePacked("FINALIZE_SALE"));
    delete timelockActions[actionType];
    emit TimelockExecuted(actionType, block.timestamp);
  }
  
  function _checkAllApprovals() internal view returns (bool) {
    bool allApproved = approvals[config.seller] && approvals[config.lender];
    for (uint i = 0; i < buyers.length; i++) {
      allApproved = allApproved && approvals[buyers[i]];
    }
    return allApproved;
  }
  
  function _executeFinalization(uint256 totalBalance) internal {
    config.aavePool.withdraw(address(config.usdc), type(uint256).max, address(this));
    
    if (!config.usdc.transfer(config.seller, totalBalance))
      revert TransferFailed();
    
    IERC1155 nft = IERC1155(config.nftAddress);
    for (uint i = 0; i < buyers.length; i++) {
      nft.safeTransferFrom(
        config.seller,
        buyers[i],
        config.nftID,
        buyerShares[buyers[i]],
        ''
      );
    }
    
    currentPhase = Phase(4, block.timestamp);
    emit TransactionFinalized(config.seller, totalBalance, block.timestamp);
    
    uint256 yield = totalBalance > config.purchasePrice ? totalBalance - config.purchasePrice : 0;
    emit YieldEarned(yield, block.timestamp);
  }
  
  function initiateCancelSale() external nonReentrant {
    if (currentPhase.id == 4 || currentPhase.id == 5)
      revert InvalidPhase(3, currentPhase.id);
    
    bytes32 actionType = keccak256(abi.encodePacked("CANCEL_SALE"));
    
    timelockActions[actionType] = TimelockAction({
      executeAfter: block.timestamp + TIMELOCK_DELAY,
      isPending: true,
      actionType: actionType
    });
    
    emit TimelockInitiated(actionType, block.timestamp + TIMELOCK_DELAY);
  }
  
  function cancelSale() external nonReentrant timelockReady(keccak256(abi.encodePacked("CANCEL_SALE"))) {
    if (currentPhase.id == 4 || currentPhase.id == 5)
      revert InvalidPhase(3, currentPhase.id);
    
    uint256 totalBalance = getBalance();
    uint256 totalDeposited = totalEarnestDeposited + lenderDeposited;
    uint256 yield = totalBalance > totalDeposited ? totalBalance - totalDeposited : 0;
    
    config.aavePool.withdraw(address(config.usdc), type(uint256).max, address(this));
    
    bool isSellerBackingOut = (msg.sender == config.seller);
    if (isSellerBackingOut || !inspectionPassed) {
      bool inspectionFailedForEvent = !isSellerBackingOut && !inspectionPassed;
      
      for (uint i = 0; i < buyers.length; i++) {
        address buyerAddr = buyers[i];
        uint256 buyerPrincipal = buyerEarnestDeposited[buyerAddr];
        uint256 buyerYield = totalDeposited == 0 ? 0 : (yield * buyerPrincipal) / totalDeposited;
        
        if (!config.usdc.transfer(buyerAddr, buyerPrincipal + buyerYield))
          revert TransferFailed();
        
        emit TransactionCancelled(
          inspectionFailedForEvent,
          buyerPrincipal + buyerYield,
          buyerAddr,
          block.timestamp
        );
      }
      
      if (lenderDeposited > 0) {
        uint256 lenderYield = totalDeposited == 0 ? 0 : (yield * lenderDeposited) / totalDeposited;
        if (!config.usdc.transfer(config.lender, lenderDeposited + lenderYield))
          revert TransferFailed();
        
        emit TransactionCancelled(
          inspectionFailedForEvent,
          lenderDeposited + lenderYield,
          config.lender,
          block.timestamp
        );
      }
    } else {
      if (!config.usdc.transfer(config.seller, totalBalance))
        revert TransferFailed();
      
      emit TransactionCancelled(false, totalBalance, config.seller, block.timestamp);
    }
    
    currentPhase = Phase(5, block.timestamp);
    
    // Clear timelock
    bytes32 actionType = keccak256(abi.encodePacked("CANCEL_SALE"));
    delete timelockActions[actionType];
    emit TimelockExecuted(actionType, block.timestamp);
  }
  
  function getBalance() public view returns (uint256) {
    return IAaveToken(config.aUsdc).balanceOf(address(this));
  }
  
  function getTimelockStatus(string memory actionType) external view returns (bool isPending, uint256 executeAfter) {
    bytes32 actionHash = keccak256(abi.encodePacked(actionType));
    TimelockAction memory action = timelockActions[actionHash];
    return (action.isPending, action.executeAfter);
  }
}