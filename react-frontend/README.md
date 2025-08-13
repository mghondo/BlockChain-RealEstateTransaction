# FracEstate React Frontend

A modern React application for fractional real estate investment built with blockchain technology.

## 🚀 Features

- **Wallet Integration**: MetaMask wallet connection with multi-chain support
- **Property Investment**: Browse and invest in tokenized real estate properties
- **Cross-Chain Support**: Ethereum mainnet, Polygon, and testnets
- **Modern UI**: Material-UI with dark theme and crypto-native design
- **Real-time Updates**: Live balance and transaction tracking
- **Mobile Ready**: Responsive design optimized for React Native conversion

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Material-UI (MUI) v5
- **Blockchain**: ethers.js v6
- **Routing**: React Router v6
- **State Management**: React Context + useReducer
- **Build Tool**: Vite
- **Package Manager**: npm

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd react-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
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

### Core Components
- `Header` - Navigation bar with wallet connection
- `PropertyList` - Browse available properties with filtering
- `PropertyCard` - Individual property display component
- `PropertyDetail` - Detailed property view with investment options
- `Dashboard` - User portfolio and investment overview
- `LandingPage` - Marketing homepage

### Custom Hooks
- `useWallet` - Wallet connection and management
- `useContracts` - Smart contract interactions
- `useTokenBalance` - Token balance tracking
- `useWeb3Context` - Global Web3 state management

### Context Providers
- `Web3Provider` - Global Web3 state and functions

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

## 🔮 Future Enhancements

- [ ] React Native mobile app
- [ ] DeFi yield farming integration
- [ ] NFT marketplace integration
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Social features and community
- [ ] DAO governance integration

---

Built with ❤️ for the future of real estate investment.
