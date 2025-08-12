import { Injectable } from '@angular/core';
import { ethers, Contract } from 'ethers';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { Web3Service } from './web3.service';

export interface PropertyConfig {
  nftAddress: string;
  nftID: bigint;
  purchasePrice: bigint;
  escrowAmount: bigint;
  seller: string;
  inspector: string;
  lender: string;
}

export interface PropertyPhase {
  id: number;
  timestamp: bigint;
  name: string;
}

export interface PropertyMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
}

export interface PropertyDetails {
  config: PropertyConfig;
  currentPhase: PropertyPhase;
  totalShares: number;
  availableShares: number;
  totalEarnestDeposited: bigint;
  inspectionPassed: boolean;
  metadata?: PropertyMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private readonly ESCROW_ABI = [
    "constructor(address,address,uint256,uint256,uint256,address,address,address,address,address,address,address)",
    "function config() view returns (tuple(address nftAddress, uint256 nftID, uint256 purchasePrice, uint256 escrowAmount, address seller, address inspector, address lender, address usdc, address aavePool, address aUsdc, address kycOracle))",
    "function currentPhase() view returns (tuple(uint8 id, uint256 timestamp))",
    "function buyers(uint256) view returns (address)",
    "function buyerShares(address) view returns (uint256)",
    "function buyerEarnestDeposited(address) view returns (uint256)",
    "function totalEarnestDeposited() view returns (uint256)",
    "function inspectionPassed() view returns (bool)",
    "function approvals(address) view returns (bool)",
    "function getBalance() view returns (uint256)",
    "function depositEarnest(uint256) external",
    "function updateInspectionStatus(bool) external",
    "function approveByRole(string) external",
    "function initializeBuyers(address[], uint256[]) external",
    "function depositFullPrice(uint256) external",
    "function initiateFinalizeSale() external",
    "function finalizeSale() external",
    "function initiateCancelSale() external",
    "function cancelSale() external",
    "function getTimelockStatus(string) view returns (bool isPending, uint256 executeAfter)",
    "event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp)",
    "event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp)",
    "event ApprovalGranted(address indexed approver, string role, uint256 timestamp)",
    "event TransactionFinalized(address indexed seller, uint256 amount, uint256 timestamp)",
    "event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp)"
  ];

  private readonly REALESTATE_ABI = [
    "constructor()",
    "function mint(string memory tokenURI) returns (uint256)",
    "function uri(uint256 tokenId) view returns (string)",
    "function balanceOf(address account, uint256 id) view returns (uint256)",
    "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
    "function setApprovalForAll(address operator, bool approved) external",
    "function isApprovedForAll(address account, address operator) view returns (bool)",
    "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external",
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
    "event URI(string value, uint256 indexed id)"
  ];

  private readonly CONTRACT_ADDRESSES = {
    ethereum: {
      realEstate: '0x0000000000000000000000000000000000000000', // Placeholder
      escrow: '0x0000000000000000000000000000000000000000'
    },
    polygon: {
      realEstate: '0x0000000000000000000000000000000000000000', // Placeholder
      escrow: '0x0000000000000000000000000000000000000000'
    }
  };

  private propertiesSubject = new BehaviorSubject<PropertyDetails[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  private realEstateContract?: Contract;
  private escrowContracts: Map<string, Contract> = new Map();

  constructor(private web3Service: Web3Service) {
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      const provider = await this.web3Service.getProvider();
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();
      
      let addresses;
      if (chainId === '1' || chainId === '11155111') { // Ethereum mainnet/Sepolia
        addresses = this.CONTRACT_ADDRESSES.ethereum;
      } else if (chainId === '137' || chainId === '80001') { // Polygon mainnet/Mumbai
        addresses = this.CONTRACT_ADDRESSES.polygon;
      } else {
        console.warn('Unknown network, using Ethereum addresses');
        addresses = this.CONTRACT_ADDRESSES.ethereum;
      }

      this.realEstateContract = new Contract(
        addresses.realEstate,
        this.REALESTATE_ABI,
        provider
      );

    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    }
  }

  async getEscrowContract(contractAddress: string): Promise<Contract | undefined> {
    if (!this.escrowContracts.has(contractAddress)) {
      try {
        const provider = await this.web3Service.getProvider();
        const contract = new Contract(contractAddress, this.ESCROW_ABI, provider);
        this.escrowContracts.set(contractAddress, contract);
      } catch (error) {
        console.error('Failed to create escrow contract instance:', error);
        return undefined;
      }
    }
    return this.escrowContracts.get(contractAddress);
  }

  async getRealEstateContract(): Promise<Contract | undefined> {
    if (!this.realEstateContract) {
      await this.initializeContracts();
    }
    return this.realEstateContract;
  }

  async getPropertyDetails(escrowAddress: string): Promise<PropertyDetails | null> {
    try {
      const escrowContract = await this.getEscrowContract(escrowAddress);
      if (!escrowContract) return null;

      const [config, currentPhase, totalEarnestDeposited, inspectionPassed] = await Promise.all([
(escrowContract as any).config(),
(escrowContract as any).currentPhase(),
(escrowContract as any).totalEarnestDeposited(),
(escrowContract as any).inspectionPassed()
      ]);

      const phaseNames = ['Initialization', 'Inspection', 'Approval', 'Funding', 'Completed', 'Cancelled'];
      
      return {
        config: {
          nftAddress: config.nftAddress,
          nftID: config.nftID,
          purchasePrice: config.purchasePrice,
          escrowAmount: config.escrowAmount,
          seller: config.seller,
          inspector: config.inspector,
          lender: config.lender
        },
        currentPhase: {
          id: currentPhase.id,
          timestamp: currentPhase.timestamp,
          name: phaseNames[currentPhase.id] || 'Unknown'
        },
        totalShares: 100,
        availableShares: 100,
        totalEarnestDeposited,
        inspectionPassed
      };

    } catch (error) {
      console.error('Failed to get property details:', error);
      return null;
    }
  }

  async depositEarnest(escrowAddress: string, amount: bigint): Promise<Observable<any>> {
    const signer = await this.web3Service.getSigner();
    const escrowContract = await this.getEscrowContract(escrowAddress);
    
    if (!signer || !escrowContract) {
      throw new Error('Signer or contract not available');
    }

    const contractWithSigner = escrowContract.connect(signer);
    return from((contractWithSigner as any).depositEarnest(amount));
  }

  async approveRole(escrowAddress: string, role: string): Promise<Observable<any>> {
    const signer = await this.web3Service.getSigner();
    const escrowContract = await this.getEscrowContract(escrowAddress);
    
    if (!signer || !escrowContract) {
      throw new Error('Signer or contract not available');
    }

    const contractWithSigner = escrowContract.connect(signer);
    return from((contractWithSigner as any).approveByRole(role));
  }

  async updateInspection(escrowAddress: string, passed: boolean): Promise<Observable<any>> {
    const signer = await this.web3Service.getSigner();
    const escrowContract = await this.getEscrowContract(escrowAddress);
    
    if (!signer || !escrowContract) {
      throw new Error('Signer or contract not available');
    }

    const contractWithSigner = escrowContract.connect(signer);
    return from((contractWithSigner as any).updateInspectionStatus(passed));
  }

  async finalizeSale(escrowAddress: string): Promise<Observable<any>> {
    const signer = await this.web3Service.getSigner();
    const escrowContract = await this.getEscrowContract(escrowAddress);
    
    if (!signer || !escrowContract) {
      throw new Error('Signer or contract not available');
    }

    const contractWithSigner = escrowContract.connect(signer);
    return from((contractWithSigner as any).finalizeSale());
  }

  async cancelSale(escrowAddress: string): Promise<Observable<any>> {
    const signer = await this.web3Service.getSigner();
    const escrowContract = await this.getEscrowContract(escrowAddress);
    
    if (!signer || !escrowContract) {
      throw new Error('Signer or contract not available');
    }

    const contractWithSigner = escrowContract.connect(signer);
    return from((contractWithSigner as any).cancelSale());
  }

  async getTimelockStatus(escrowAddress: string, actionType: string): Promise<{isPending: boolean, executeAfter: bigint} | null> {
    try {
      const escrowContract = await this.getEscrowContract(escrowAddress);
      if (!escrowContract) return null;

      const [isPending, executeAfter] = await (escrowContract as any).getTimelockStatus(actionType);
      return { isPending, executeAfter };
    } catch (error) {
      console.error('Failed to get timelock status:', error);
      return null;
    }
  }

  async getUserShares(escrowAddress: string, userAddress: string): Promise<bigint> {
    try {
      const escrowContract = await this.getEscrowContract(escrowAddress);
      if (!escrowContract) return BigInt(0);

      return await (escrowContract as any).buyerShares(userAddress);
    } catch (error) {
      console.error('Failed to get user shares:', error);
      return BigInt(0);
    }
  }

  async getPropertyBalance(realEstateAddress: string, tokenId: bigint, userAddress: string): Promise<bigint> {
    try {
      const realEstateContract = await this.getRealEstateContract();
      if (!realEstateContract) return BigInt(0);

      return await (realEstateContract as any).balanceOf(userAddress, tokenId);
    } catch (error) {
      console.error('Failed to get property balance:', error);
      return BigInt(0);
    }
  }

  updateProperties(properties: PropertyDetails[]) {
    this.propertiesSubject.next(properties);
  }

  getCurrentProperties(): PropertyDetails[] {
    return this.propertiesSubject.value;
  }
}