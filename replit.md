# x4pp - P2P Attention Market DM App

## Overview

x4pp is a peer-to-peer messaging application with an innovative "attention market" model where sending messages requires humanity verification and dynamic pricing. The app enables users to monetize their attention by setting prices for incoming messages, with built-in protections against spam through verification gates and surge pricing mechanisms.

**Recent Updates (Oct 22, 2025):**
- **CRITICAL PAYMENT FIXES COMPLETED ✅**: Fixed escrow-settle-refund flow for open bidding model
  - Backend: settlePayment now replays ORIGINAL EIP-3009 authorization with validAfter/validBefore from commit
  - Backend: refundPayment simplified - no on-chain transfer needed (authorization simply not executed)
  - Backend: commit endpoint stores complete signature object with validAfter/validBefore for settlement
  - Architecture: Funds never leave sender's wallet until receiver accepts (true escrow via EIP-3009)
  - Security: Fixed signature replay bug that would have broken all settlements
- **Open Bidding Model Backend Complete ✅**: Simplified from surge pricing to receiver-driven bidding
  - Schema: Removed surge pricing fields (surgeAlpha, surgeK, humanDiscountPct, slotsPerWindow, timeWindow)
  - Schema: Renamed basePrice → minBasePrice (receiver sets minimum acceptable bid)
  - Schema: Added bidUsd, acceptedAt, declinedAt to messages; status enum: pending/accepted/declined/expired
  - API: GET /api/price-guide/:username calculates P25/median/P75 from pending bids (winsorized)
  - API: POST /api/messages/commit creates pending message with bidUsd (not auto-accepted)
  - API: GET /api/messages/pending retrieves pending messages sorted by bid descending
  - API: POST /api/messages/:id/accept settles payment on-chain and marks message accepted
  - API: POST /api/messages/:id/decline marks authorization unused (no refund transfer)
  - API: Settings endpoints updated to minBasePrice-only schema (slaHours, walletAddress, tokenId)
  - Auto-refund: Updated to refund expired pending messages (24h SLA)
- **Wallet-Based Auto-Login Implemented ✅**: Seamless authentication when wallet connects
  - Backend: Login endpoint now accepts walletAddress for auto-login
  - Frontend: WalletProvider auto-logs in users when they connect their wallet
  - Frontend: Auto-logout when disconnecting wallet for security
  - Flow: Connect wallet → check if registered → auto-login if exists → page reload to update state
- **Session-Based Authentication System Implemented ✅**: Fixed settings screen data synchronization
  - Backend: express-session with PostgreSQL store for persistent sessions
  - Backend: Auto-login after registration (sets userId and username in session)
  - Backend: Auth endpoints: GET /api/auth/me, POST /api/auth/login, POST /api/auth/logout
  - Frontend: useAuth hook with React Query for current user state management
  - Frontend: SettingsPanel now uses authenticated user instead of hardcoded "demo_user"
  - Testing: Full E2E flow validated (register → auto-login → settings shows correct data)
- **User Registration System Complete ✅**: Real users with real Celo wallets
  - Backend: Strict Zod validation for all pricing fields with proper ranges
  - Backend: SHA-256 nullifier generation from wallet address for uniqueness
  - Backend: Duplicate detection for username, wallet address, and nullifier
  - Frontend: react-hook-form with zodResolver and shadcn Form components
  - Frontend: Wallet connection requirement before registration
- **Celo Blockchain Integration Complete ✅**: Full USDC payment system on Celo mainnet
  - Backend: Payment verification using EIP-3009 `transferWithAuthorization` for gasless transfers
  - Backend: Auto-refund system executes real on-chain USDC refunds
  - Frontend: Wallet connection with wagmi for Celo network
  - Frontend: EIP-712 payment signature generation for USDC transfers
  - Security: Fixed critical recipient-binding vulnerability preventing payment theft
  - Security: Fixed signature parsing to include v, r, s components for settlement
  - Testing: End-to-end tests passed validating quote, commit, and security controls
- Implemented x402 HTTP payment protocol with PaymentRequirements structure
- Added wagmi/viem integration for Web3 wallet interactions

**Next Steps:**
- Update frontend: registration form and settings panel (remove surge pricing fields)
- Create ComposeMessage UI: fetch price guide, show reference range, bid input with quick buttons
- Create InboxPending page: show pending messages with accept/decline actions
- Manual E2E testing: registration → settings → compose → accept/decline → verify payment settlement
- Add automated integration tests for open bidding flow

Key features include:
- **Proof-of-humanity gating**: Verified humans pay discounted rates; unverified users can still send but at higher prices
- **Dynamic surge pricing**: Message costs adjust based on inbox demand and recipient availability
- **Attention slots**: Limited message capacity per time window with automatic refunds for unopened messages
- **Reputation system**: Privacy-preserving scoring based on message engagement and user behavior
- **Reply bounties**: Optional rewards for timely responses

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React** with TypeScript for UI components
- **Vite** as the build tool and development server
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Shadcn UI** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom design system

**Design System:**
- Hybrid approach inspired by Linear (messaging), Stripe (payments), Telegram (minimal patterns), and Notion (settings)
- Dark mode primary with warm purple brand color (262 70% 62%)
- Custom CSS variables for theming with support for light/dark modes
- Emphasis on trust through transparency, progressive disclosure, and speed

**Key UI Components:**
- Message composition with live price quotes
- Inbox with attention slot visualization
- Verification flow using modal dialogs
- Payment confirmation flows
- Settings panel for pricing configuration
- Reputation badges showing user engagement metrics

**State Management:**
- React Query for API data fetching and caching
- Local component state for UI interactions
- Wagmi wallet provider for Celo network connection and account management

### Backend Architecture

**Technology Stack:**
- **Express.js** server with TypeScript
- **Drizzle ORM** for database interactions
- **Neon (PostgreSQL)** via serverless driver for database
- Session management with connect-pg-simple

**API Structure:**
- RESTful endpoints under `/api` prefix
- User management (get by username, reputation scores)
- Message CRUD operations
- Reputation event logging and score computation
- Vouch and block relationship management

**Core Services:**
- **Reputation Engine** (`server/reputation.ts`): Calculates sender/recipient reputation using Wilson lower bound scoring with exponential decay (75-day half-life)
- **Storage Layer** (`server/storage.ts`): In-memory storage implementation with interface for potential database backends
- **Celo Payment Service** (`server/celo-payment.ts`): USDC contract interface, EIP-712 signature verification, on-chain payment settlement and refunds

### Data Storage

**Database Schema (PostgreSQL via Drizzle):**

1. **users**: User profiles with pricing configuration
   - `selfNullifier`: Privacy-preserving unique identifier from Self verification
   - Pricing settings: `basePrice`, `surgeMultiplier`, `slotsPerWindow`, `timeWindow`
   - `verified`: Humanity verification status

2. **messages**: Message records with payment tracking
   - Sender/recipient nullifiers for privacy
   - Amount paid and optional reply bounty
   - Timestamps for sent/opened/replied/refunded states
   - Refund reason tracking

3. **reputationEvents**: Event log for reputation calculation
   - Event types: sent, delivered, opened, replied, refunded, blocked, vouched
   - Timestamped for decay calculations
   - JSON metadata field for extensibility

4. **reputationScores**: Computed reputation metrics
   - Separate sender and recipient scores
   - Wilson lower bound rates for open/reply/positive ratings
   - Counts for blocks, refunds, vouches
   - Last updated timestamp for cache invalidation

5. **vouches**: Trust relationships between users
   - Weight system for vouch strength
   - Optional message reference for context

6. **blocks**: User blocking relationships
   - Simple nullifier pair tracking

**Payment Architecture (Celo USDC):**
- Each user must configure a Celo wallet address (`walletAddress` field) to receive payments
- Payment requirements generated via x402 protocol with recipient wallet, amount, network details
- Payments use EIP-3009 `transferWithAuthorization` for gasless USDC transfers on Celo mainnet
- Payment verification validates EIP-712 signatures on-chain before message acceptance
- Server validates recipient address matches database wallet (prevents payment theft)
- Auto-refunds execute real on-chain USDC refunds with transaction hash tracking
- Payments table tracks: sender, recipient, amount, nonce, signature, txHash, refundTxHash, status

**Data Privacy:**
- Uses Self nullifiers instead of traditional user IDs to prevent PII exposure
- No storage of verification documents or personal information
- Only policy compliance booleans stored

### Authentication and Authorization

**Implemented:**
- **Session-based authentication** using express-session with PostgreSQL store (connect-pg-simple)
  - Persistent sessions survive server restarts
  - Auto-login after user registration
  - Auth endpoints: GET /api/auth/me, POST /api/auth/login, POST /api/auth/logout
  - Frontend useAuth hook for current user state management
  - HttpOnly cookies with secure flag in production
  - SameSite: lax for CSRF protection
- **HTTP 402 payment protocol** for message sending with x402 PaymentRequirements structure
- **Celo wallet connection** via wagmi with injected provider (MetaMask, etc.)
- **EIP-712 signature generation** for USDC transfer authorization

**Planned:**
- **Self Protocol verification** for humanity proofing (currently placeholder/demo mode)
- Integration with Self-x402 facilitator for "verify once, pay instantly" flow

### Reputation System

**Algorithm Design:**
- **Wilson Lower Bound** (95% confidence) for rate calculations to prevent small-sample bias
- **Exponential Decay** with 75-day half-life to weight recent behavior
- **Dual-sided Scoring**: Separate metrics for senders and recipients

**Sender Metrics:**
- Message open rate
- Reply rate received
- Positive rating percentage
- Block rate (inverse)
- Net contribution (amount paid minus refunds)

**Recipient Metrics:**
- Open timeliness rate
- Reply rate for bounty messages
- SLA compliance
- Fair refund rate

**Privacy Preservation:**
- All metrics keyed to Self nullifier
- No PII storage
- Aggregated counts only, no message content analysis

## External Dependencies

### Third-Party Services (Planned)

1. **Self-x402 Project**
   - Humanity verification without PII disclosure
   - HTTP 402 payment protocol implementation
   - Components: consumer app, vendor API, facilitator
   - Provides nullifier-based unique human identification

2. **USDC Payments**
   - Cryptocurrency payment rail for micro-transactions
   - Integration via wagmi/Web3 libraries
   - Handles message payments and reply bounties

3. **TEE-Shield-Launcher** (Future Enhancement)
   - Trusted execution environment for frontend integrity
   - Prevents UI spoofing attacks
   - Browser extension pattern for verification

### NPM Packages

**UI/Frontend:**
- `@radix-ui/*`: Headless UI primitives (dialogs, dropdowns, tooltips, etc.)
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight routing
- `tailwindcss`: Utility-first CSS
- `class-variance-authority`, `clsx`, `tailwind-merge`: Styling utilities
- `react-hook-form`, `@hookform/resolvers`, `zod`: Form validation
- `date-fns`: Date manipulation
- `lucide-react`: Icon library

**Backend/Database:**
- `express`: Web server framework
- `drizzle-orm`: TypeScript ORM
- `@neondatabase/serverless`: PostgreSQL serverless driver
- `connect-pg-simple`: PostgreSQL session store
- `ws`: WebSocket support for Neon

**Web3 (Prepared but not fully integrated):**
- `@wagmi/core`, `@wagmi/connectors`: Ethereum wallet integration
- `viem`: Ethereum library

**Development:**
- `vite`: Build tool and dev server
- `typescript`: Type safety
- `tsx`: TypeScript execution
- `esbuild`: Production bundling

### Database

**Neon PostgreSQL:**
- Serverless PostgreSQL platform
- Connection via `@neondatabase/serverless` with WebSocket support
- Connection pooling through Pool interface
- Provisioned via `DATABASE_URL` environment variable
- Schema migrations managed by Drizzle Kit