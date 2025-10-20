# x4pp - P2P Attention Market DM App

## Overview

x4pp is a peer-to-peer messaging application with an innovative "attention market" model where sending messages requires humanity verification and dynamic pricing. The app enables users to monetize their attention by setting prices for incoming messages, with built-in protections against spam through verification gates and surge pricing mechanisms.

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
- Planned wallet connection integration (currently mocked)

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

**Payment Architecture:**
- Each user must configure a Celo wallet address (`walletAddress` field) to receive payments
- Payment requirements are generated with recipient's wallet address as destination
- Payments go directly to recipient's wallet (no escrow in MVP)
- Payment verification includes recipient address matching
- Auto-refunds execute from recipient's wallet (in production)

**Data Privacy:**
- Uses Self nullifiers instead of traditional user IDs to prevent PII exposure
- No storage of verification documents or personal information
- Only policy compliance booleans stored

### Authentication and Authorization

**Planned Integration:**
- **Self-x402** for humanity verification ("verify once, pay instantly")
- HTTP 402 payment flow for message sending
- Wallet connection for USDC payments (Web3 integration via wagmi/viem)
- Session-based authentication using connect-pg-simple

**Current State:**
- Mocked wallet connection UI
- Placeholder verification flows
- Session infrastructure in place but not fully implemented

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