# FracEstate React Frontend

A comprehensive property generation and marketplace system with Firebase integration and mobile-responsive design. Phase 1 creates a living real estate marketplace with dynamic property generation, real-time timers, and advanced filtering capabilities.

## 🚀 Phase 1 Features

### ✅ Core Property Marketplace
- **Dynamic Property Generation**: Sophisticated algorithm creating 50+ realistic properties
- **Property Classification**: 3-tier system (Class A: $2M+, Class B: $500k-$2M, Class C: $100k-$500k)
- **Regional Intelligence**: US state-based image selection with 5 regions
- **Real-time Timers**: 1.5-2 hour sellout countdowns with live updates
- **Mobile-Responsive Design**: Touch-optimized for all devices

### ✅ Advanced Features
- **Smart Filtering & Sorting**: Property class, region, price range, rental yield
- **Watchlist System**: Save and track favorite properties with portfolio analytics
- **Firebase Integration**: Real-time data persistence and synchronization
- **Property Pool Management**: Automatic generation and maintenance of 50+ properties
- **Comprehensive Error Handling**: Error boundaries and loading states

### ✅ Property Intelligence
- **Realistic Data Generation**: Addresses, amenities, and details based on property class
- **Mock Investor Profiles**: Believable investor data for each property
- **Rental Yield Calculations**: Class-specific yield ranges (C: 8-15%, B: 5-10%, A: 3-8%)
- **Regional Image Hosting**: Netlify CDN with intelligent fallback logic

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Firebase Firestore for real-time data
- **UI Framework**: Material-UI (MUI) v5 with responsive design
- **Image Hosting**: Netlify CDN with regional organization
- **State Management**: React Context + Custom Hooks
- **Blockchain**: ethers.js v6 (existing Web3 integration maintained)
- **Routing**: React Router v6
- **Build Tool**: Vite

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd react-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm install firebase  # Firebase SDK for real-time data
   ```

3. **Firebase Configuration**
   - Firebase project is pre-configured with provided credentials
   - Firestore collections: `properties`, `watchlist`, `property_interactions`
   - Real-time listeners enabled for live updates

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Initialize Property Pool**
   Open browser console and run:
   ```javascript
   fracEstate.initialize()  // Generates initial 60 properties
   ```

6. **Open in browser**
   Navigate to `http://localhost:5173`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## 🌐 Supported Networks

- **Ethereum Mainnet** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Polygon Amoy Testnet** (Chain ID: 80002)

## 📱 Component Architecture

### FracEstate Components (New)
- `FracEstatePropertyList` - Advanced property browsing with filtering/sorting
- `FracEstatePropertyCard` - Mobile-responsive property cards with timers
- `FracEstatePropertyDetail` - Comprehensive property details with investment calculator
- `Watchlist` - Property watchlist management with analytics
- `ErrorBoundary` - Application error handling
- `LoadingStates` - Comprehensive loading state components
- `ErrorStates` - Specialized error state components

### Legacy Components (Maintained)
- `Header` - Navigation bar with wallet connection
- `PropertyList` - Original property list (legacy)
- `PropertyCard` - Original property card (legacy)
- `PropertyDetail` - Original property detail (legacy)
- `Dashboard` - User portfolio and investment overview
- `LandingPage` - Marketing homepage

### Custom Hooks
- `usePropertyPool` - Property pool management and real-time updates
- `useWatchlist` - Watchlist functionality with Firebase persistence
- `usePropertyTimer` - Individual property countdown timers
- `useWallet` - Wallet connection and management (existing)
- `useContracts` - Smart contract interactions (existing)
- `useTokenBalance` - Token balance tracking (existing)

### Services
- `propertyService` - Firebase CRUD operations for properties
- `watchlistService` - Firebase watchlist management
- `propertyPoolManager` - Automatic property pool maintenance
- `propertyGenerator` - Intelligent property generation engine

## 🔐 Smart Contract Integration

The app integrates with multiple smart contracts:

- **RealEstate.sol** - NFT contract for property tokenization
- **Escrow.sol** - Basic escrow functionality
- **EscrowWithStableAndYield.sol** - USDC deposits with yield farming
- **EscrowWithStableAndYieldCrossChain.sol** - Cross-chain escrow via LayerZero
- **MockUSDC.sol** - USDC token for testing
- **KYCOracle.sol** - KYC verification system

## 🎨 Theme & Styling

The app uses a custom dark theme optimized for crypto applications:

- **Primary Color**: Cyan (#00d4ff)
- **Secondary Color**: Orange (#ff6b35)
- **Background**: Dark gradient (0a0a0a → 1a1a2e → 16213e)
- **Glass Effects**: Backdrop blur with subtle borders
- **Typography**: Inter font family with optimized weights

## 🔄 Migration from Angular

This React application is a complete conversion from the original Angular codebase, maintaining:

- ✅ All Web3 functionality
- ✅ Smart contract interactions
- ✅ UI/UX design patterns
- ✅ Responsive layout
- ✅ Multi-chain support
- ✅ TypeScript strict typing

## 📱 React Native Compatibility

The codebase is structured for easy React Native conversion:

- Uses React Context instead of Angular services
- Functional components with hooks
- Styled-components compatible styling approach
- No DOM-specific dependencies in business logic
- Mobile-first responsive design

## 🔒 Security Features

- MetaMask integration with secure wallet connection
- Transaction signing and verification
- Network validation and switching
- Error boundary protection
- Input sanitization and validation

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🛟 Support

For support, email support@fracestate.com or join our Discord community.

## 🧪 Development Tools

### Browser Console Utilities
FracEstate provides development tools accessible via `window.fracEstate`:

```javascript
// System Management
fracEstate.initialize()     // Initialize with 60 sample properties
fracEstate.health()         // Check system health status
fracEstate.fix()            // Fix common issues automatically
fracEstate.reset()          // Reset all data (dev only)
fracEstate.testData()       // Add test properties with edge cases

// Pool Manager Controls
fracEstate.poolManager.start()           // Start property pool manager
fracEstate.poolManager.stop()            // Stop property pool manager
fracEstate.poolManager.forceMaintenance() // Force maintenance cycle
fracEstate.poolManager.getPoolStats()    // Get detailed statistics
```

### Firebase Schema
```typescript
// Properties Collection
{
  id: string,
  class: 'A' | 'B' | 'C',
  address: string,
  city: string,
  state: string,
  region: 'midwest' | 'southwest' | 'southeast' | 'northwest' | 'anywhere',
  price: number,
  sqft: number,
  bedrooms: number,
  bathrooms: number,
  yearBuilt: number,
  rentalYield: number,     // Decimal (0.08 = 8%)
  currentValue: number,
  imageUrl: string,
  createdAt: Timestamp,
  selloutTime: Timestamp,  // 1.5-2 hours from creation
  status: 'available' | 'ending_soon' | 'sold_out',
  mockInvestors: MockInvestor[],
  amenities: string[],
  totalShares: number,
  availableShares: number,
  sharePrice: number
}

// Watchlist Collection
{
  id: string,
  userId: string,
  propertyId: string,
  addedDate: Timestamp
}
```

## 🎯 Phase 1 Demo Features

### Property Marketplace
1. **Browse Properties**: Filter by class, region, price, rental yield
2. **Real-time Countdown**: Live sellout timers (1.5-2 hours)
3. **Property Details**: Comprehensive investment calculator
4. **Watchlist**: Save and track favorite properties
5. **Mobile Responsive**: Touch-optimized for all devices

### Property Intelligence
1. **Regional Distribution**: US state-based image selection
2. **Class-based Generation**: Realistic property details by tier
3. **Mock Investors**: Believable investor profiles
4. **Automatic Pool Maintenance**: Maintains 50+ active properties

## 🔮 Future Enhancements (Phase 2+)

- [ ] **Blockchain Integration**: Smart contract investment processing
- [ ] **User Authentication**: Firebase Auth with user profiles
- [ ] **Payment Processing**: Stripe/cryptocurrency payments
- [ ] **Advanced Analytics**: Investment performance tracking
- [ ] **Social Features**: User profiles and property sharing
- [ ] **Notifications**: Push notifications for property updates
- [ ] **React Native App**: Native mobile application
- [ ] **DeFi Integration**: Yield farming and liquidity pools

---

Built with ❤️ for the future of real estate investment.
