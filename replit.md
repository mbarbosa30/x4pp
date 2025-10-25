# x4pp - P2P Attention Market DM App

## Overview

x4pp is a peer-to-peer messaging application featuring an "attention market" where message sending uses wallet-based routing with open bidding. Recipients set minimum bid prices, while senders (who don't need accounts) can send messages to usernames, wallet addresses, or ENS domains. The platform uses an open bidding model where senders place bids, and recipients manually accept or decline messages. Key features include EIP-3009 deferred payment authorization (funds remain in sender's wallet until acceptance), automatic bid expiry, and a privacy-preserving reputation system.

## Recent Changes

**October 25, 2025:**
- **Wallet Connection Stability** (critical fixes):
  - Implemented HMR-safe singleton pattern for AppKit and wagmi config in `globalThis` to prevent recreation on hot reloads
  - Added auto-disconnect on mount to clear stale WalletConnect sessions that caused reconnection loops
  - Implemented reconnection loop detection - auto-breaks after 3 rapid attempts
  - Cleared stale WalletConnect localStorage keys (`wc@2`, `@w3m`, `W3M`) on init to prevent auto-reconnect issues
  - Fixed routing order: moved catch-all `/:identifier` route to end so `/app`, `/inbox`, etc. are matched before username routes
- **ENS Domain Support**: Added ENS resolution for message recipients - users can now send messages to ENS names like "vitalik.eth" which are automatically resolved to wallet addresses using viem on Ethereum mainnet
- **Authentication Flow Improvements** (full polish based on analysis):
  - Optimized landing page to use query data intelligently - no longer makes redundant login calls
  - Added error toasts for query failures to provide better user feedback
  - Implemented route guards with ProtectedRoute component - all authenticated pages now require valid session
  - Added refetchOnWindowFocus to critical auth queries for better reconnect reliability
  - Enhanced cache invalidation strategy to prevent stale data on wallet reconnect

**October 24, 2025:**
- Fixed mobile bid input bug: Users can now properly delete and edit bid amounts when sending messages (dual-state pattern with string display and number validation)
- Fixed login flow race condition: login() now returns auth payload directly to prevent registered wallets from being incorrectly routed to registration
- Fixed outbox query bug: Messages sent before registration now appear in outbox after user registers (changed SQL template to eq() function for reliable wallet address comparison)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React** (TypeScript) and **Vite**, using **Wouter** for routing and **TanStack Query** for server state management. **Shadcn UI** (with Radix UI primitives) and **Tailwind CSS** provide a modern, custom design system inspired by Linear, Stripe, Telegram, and Notion, prioritizing a dark mode with a warm purple accent. Key UI components include message composition with live price quotes, an inbox with attention slot visualization, verification flows, payment confirmations, and a settings panel for pricing configuration. **Wagmi** handles Celo network connection and account management.

### Backend Architecture

The backend utilizes **Express.js** (TypeScript) and **Drizzle ORM** for interacting with a **Neon (PostgreSQL)** database. It provides RESTful APIs for user management, message operations, reputation event logging, and vouch/block management. Core services include a **Reputation Engine** using Wilson lower bound scoring with exponential decay, and a **Celo Payment Service** for USDC contract interactions, EIP-712 signature verification, and on-chain payment settlement and refunds. Session-based authentication is managed with `express-session` and a PostgreSQL store, integrated with **Reown AppKit** for WalletConnect v2.

### Data Storage

The PostgreSQL database schema includes tables for:
- `users`: User profiles with `walletAddress` (primary routing identifier), `username`, `minBasePrice`, and other settings.
- `messages`: Message records with `senderWallet`, `recipientWallet`, bid amounts, and status (pending/accepted/declined/expired).
- `reputationEvents`: Log for reputation calculation.
- `reputationScores`: Computed sender and recipient reputation metrics using wallet addresses.
- `vouches`: Trust relationships.
- `blocks`: User blocking.

**Message Routing:** All messages are routed by wallet address. Messages can be sent to:
1. **Registered users** (via username, wallet address, or ENS domain): Uses user's configured minimum bid price
2. **Unregistered wallet addresses**: Uses platform default minimum bid ($0.10, defined in `shared/constants.ts`)
3. **ENS domains**: Automatically resolved to wallet addresses on Ethereum mainnet using viem's ENS resolver

Messages sent to an unregistered wallet will appear in the inbox when that wallet registers. ENS resolution happens client-side with normalized names (supports mixed-case like "Vitalik.eth").

Payment architecture uses EIP-3009 `transferWithAuthorization` for deferred USDC payments on Celo mainnet, with server-side validation of EIP-712 signatures. Funds remain in the sender's wallet until the recipient accepts the message, at which point settlement occurs on-chain.

**Token Configuration:**
- **USDC Token ID**: `60481d40-b8ce-41d9-8ced-32aee91a04ea`
- **USDC Contract Address**: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (Circle's official native USDC on Celo mainnet)
- **Chain ID**: 42220 (Celo mainnet)
- **Decimals**: 6
- **Database Initialization**: Automatic USDC token creation on app startup via `server/db-init.ts` (works in both dev and production)

### Authentication and Authorization

**Two-tier access model:**
1. **Unauthenticated senders**: Can send messages to any username or wallet address by connecting a wallet (no account needed)
2. **Registered recipients**: Must register to receive messages, set pricing, and manage their inbox

The system implements **session-based authentication** using `express-session` with a PostgreSQL store for persistent user sessions. **Reown AppKit** provides a professional WalletConnect v2 integration for seamless wallet connection and auto-login/logout. The **HTTP 402 payment protocol** is used for message sending, and **Celo blockchain integration** via wagmi handles on-chain interactions and EIP-712 payment signature generation.

**Routing:**
- `/@username`: Public message page for registered users
- `/0x...`: Public message page for any wallet address (registered or not)

### Reputation System

The reputation system uses **Wilson Lower Bound** (95% confidence) and **Exponential Decay** (75-day half-life) to calculate dual-sided scores for senders and recipients. Metrics include message open/reply rates, positive ratings, block rates, and net contribution for senders; and open timeliness, reply rates, and SLA compliance for recipients. All metrics are keyed to wallet addresses for consistency with the message routing system.

### Platform Constants

**Shared constants** (defined in `shared/constants.ts`):
- `PLATFORM_DEFAULT_MIN_BID`: $0.10 - Minimum bid for messages sent to unregistered wallet addresses

## External Dependencies

### Third-Party Services

1.  **Reown AppKit**: For robust wallet connection using WalletConnect v2.
2.  **Neon PostgreSQL**: Serverless database solution.

### NPM Packages

**UI/Frontend:**
-   `@radix-ui/*`: Headless UI primitives.
-   `@tanstack/react-query`: Server state management.
-   `wouter`: Lightweight routing.
-   `tailwindcss`: CSS framework.
-   `react-hook-form`, `zod`: Form validation.
-   `lucide-react`: Icon library.

**Backend/Database:**
-   `express`: Web server framework.
-   `drizzle-orm`: TypeScript ORM.
-   `@neondatabase/serverless`: PostgreSQL serverless driver.
-   `connect-pg-simple`: PostgreSQL session store.

**Web3:**
-   `@wagmi/core`, `@wagmi/connectors`: Ethereum wallet integration.
-   `viem`: Ethereum library.

### Database

**Neon PostgreSQL:**
-   Serverless PostgreSQL platform connected via `@neondatabase/serverless`.
-   Schema migrations managed by Drizzle Kit.