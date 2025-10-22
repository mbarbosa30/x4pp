# x4pp - P2P Attention Market DM App

## Overview

x4pp is a peer-to-peer messaging application featuring an "attention market" where message sending requires humanity verification and dynamic pricing. It allows users to monetize their attention by setting prices for incoming messages, protected by verification gates and surge pricing to prevent spam. The platform incorporates an open bidding model where senders place bids, and recipients manually accept or decline messages. Key features include EIP-3009 escrow for secure payments, automatic bid expiry, and a privacy-preserving reputation system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React** (TypeScript) and **Vite**, using **Wouter** for routing and **TanStack Query** for server state management. **Shadcn UI** (with Radix UI primitives) and **Tailwind CSS** provide a modern, custom design system inspired by Linear, Stripe, Telegram, and Notion, prioritizing a dark mode with a warm purple accent. Key UI components include message composition with live price quotes, an inbox with attention slot visualization, verification flows, payment confirmations, and a settings panel for pricing configuration. **Wagmi** handles Celo network connection and account management.

### Backend Architecture

The backend utilizes **Express.js** (TypeScript) and **Drizzle ORM** for interacting with a **Neon (PostgreSQL)** database. It provides RESTful APIs for user management, message operations, reputation event logging, and vouch/block management. Core services include a **Reputation Engine** using Wilson lower bound scoring with exponential decay, and a **Celo Payment Service** for USDC contract interactions, EIP-712 signature verification, and on-chain payment settlement and refunds. Session-based authentication is managed with `express-session` and a PostgreSQL store, integrated with **Reown AppKit** for WalletConnect v2.

### Data Storage

The PostgreSQL database schema includes tables for:
- `users`: User profiles with `selfNullifier`, `minBasePrice`, `slaHours`, and `walletAddress`.
- `messages`: Message records with sender/recipient nullifiers, bid amounts, and status (pending/accepted/declined/expired).
- `reputationEvents`: Log for reputation calculation.
- `reputationScores`: Computed sender and recipient reputation metrics.
- `vouches`: Trust relationships.
- `blocks`: User blocking.

Payment architecture uses EIP-3009 `transferWithAuthorization` for gasless USDC transfers on Celo mainnet, with server-side validation of EIP-712 signatures. Data privacy is maintained through the use of Self nullifiers and aggregation of metrics, avoiding storage of PII.

**Token Configuration:**
- **USDC Token ID**: `60481d40-b8ce-41d9-8ced-32aee91a04ea`
- **USDC Contract Address**: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (Circle's official native USDC on Celo mainnet)
- **Chain ID**: 42220 (Celo mainnet)
- **Decimals**: 6
- **Database Initialization**: Automatic USDC token creation on app startup via `server/db-init.ts` (works in both dev and production)

### Authentication and Authorization

The system implements **session-based authentication** using `express-session` with a PostgreSQL store for persistent user sessions. **Reown AppKit** provides a professional WalletConnect v2 integration for seamless wallet connection and auto-login/logout. The **HTTP 402 payment protocol** is used for message sending, and **Celo blockchain integration** via wagmi handles on-chain interactions and EIP-712 payment signature generation.

### Reputation System

The reputation system uses **Wilson Lower Bound** (95% confidence) and **Exponential Decay** (75-day half-life) to calculate dual-sided scores for senders and recipients. Metrics include message open/reply rates, positive ratings, block rates, and net contribution for senders; and open timeliness, reply rates, and SLA compliance for recipients. All metrics are keyed to Self nullifiers for privacy.

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