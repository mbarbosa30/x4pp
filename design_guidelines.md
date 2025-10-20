# Design Guidelines: x4pp - p2p Attention Market DM App

## Design Approach

**Hybrid Reference-Based Approach**

Drawing inspiration from:
- **Linear**: Clean, efficient messaging interface with sophisticated typography
- **Stripe**: Clear, trustworthy payment UI with excellent price transparency
- **Telegram**: Minimal, fast messaging patterns
- **Notion**: Friendly settings and configuration interfaces

**Core Principles:**
- Trust through clarity: Every price, fee, and transaction is transparent
- Warm professionalism: Human-centered without sacrificing efficiency
- Progressive disclosure: Complex features (verification, pricing) revealed contextually
- Speed matters: Instant feedback on all actions

---

## Color Palette

### Dark Mode (Primary)
**Base Colors:**
- Background: 222 12% 9% (deep charcoal)
- Surface: 222 12% 12% (elevated cards)
- Surface elevated: 222 12% 15%

**Brand Primary:**
- Primary: 262 70% 62% (warm purple - trust + innovation)
- Primary hover: 262 70% 55%

**Accent:**
- Success green: 142 71% 45% (verified badges, successful payments)
- Warning amber: 38 92% 50% (surge pricing alerts)
- Price blue: 217 91% 60% (payment amounts, quotes)

**Text:**
- Primary text: 222 10% 95%
- Secondary text: 222 8% 70%
- Muted text: 222 8% 50%

### Light Mode
**Base Colors:**
- Background: 0 0% 100%
- Surface: 222 12% 98%
- Surface elevated: 0 0% 100%

**Brand Primary:**
- Primary: 262 60% 52%
- Primary hover: 262 60% 45%

**Text:**
- Primary text: 222 12% 12%
- Secondary text: 222 8% 40%
- Muted text: 222 8% 60%

---

## Typography

**Font Families:**
- Primary: 'Inter' (body text, UI elements)
- Display: 'Inter' with tighter tracking (headings, prices)
- Mono: 'JetBrains Mono' (wallet addresses, transaction IDs)

**Scale:**
- Hero: text-5xl font-bold (48px)
- H1: text-3xl font-semibold (30px)
- H2: text-2xl font-semibold (24px)
- H3: text-xl font-medium (20px)
- Body: text-base (16px)
- Small: text-sm (14px)
- Tiny: text-xs (12px)

**Pricing Display:**
- Large prices: text-4xl font-bold tabular-nums
- Inline prices: text-lg font-semibold tabular-nums
- Currency symbols: text-sm opacity-70

---

## Layout System

**Spacing Units:**
Primary rhythm based on 4px base: 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32

**Common Patterns:**
- Card padding: p-6 (24px)
- Section spacing: space-y-8 (32px)
- Element gaps: gap-4 (16px)
- Tight spacing: gap-2 (8px)

**Containers:**
- Chat area: max-w-4xl mx-auto
- Settings panels: max-w-2xl
- Modals: max-w-lg

**Responsive Grid:**
- Mobile: Single column, full-width
- Tablet (md:): Two-column where appropriate (inbox + detail)
- Desktop (lg:): Three-column layout option (contacts + chat + info panel)

---

## Component Library

### Navigation
**Top Bar:**
- Fixed height: h-16
- Blur backdrop: backdrop-blur-lg bg-opacity-80
- Contains: Logo, wallet connection status, user avatar, settings icon
- Subtle border-bottom with low opacity

### Message Composition
**Compose Card:**
- Elevated surface with subtle shadow
- Three-section layout: recipient input, message textarea, pricing footer
- Auto-expanding textarea (min-h-24, max-h-48)
- Live price quote in bottom-right with animated update on input
- Verification badge toggle (if user is verified)

**Price Quote Display:**
- Floating pill design with gradient background
- Two-tier pricing: "Verified: $0.02" | "Unverified: $0.15"
- Animated pulse on price updates
- Icon: dollar sign with subtle glow

### Inbox View
**Message Cards:**
- Compact list items: h-20 with hover elevation
- Three-column grid: sender avatar + preview + price badge
- Unopened messages: brighter background, bold sender name
- Time remaining indicator: small progress bar at bottom
- Swipe actions on mobile: open/ignore

**Attention Slots Indicator:**
- Top of inbox: horizontal slot tracker
- Visual: 5 circular slots, filled/empty states
- Text: "3 of 5 slots available this hour"
- Color: filled slots use success green

### Payment Flow
**x402 Payment Modal:**
- Center overlay: backdrop-blur-md
- Card design: max-w-md with generous padding
- Three states: Loading, Confirm, Processing
- Clear breakdown: base price + surge + fees = total
- Large confirm button: full-width, primary color
- MetaMask/WalletConnect integration indicators

**Transaction Status:**
- Toast notifications: top-right corner
- Three states with icons: pending (spinner), success (check), failed (x)
- Auto-dismiss after 5s for success, manual for errors

### Settings Dashboard
**Panel Layout:**
- Sidebar navigation (on desktop): left-aligned, w-64
- Content area: max-w-2xl with section cards
- Sections: Pricing, Slots, Verification, Blocklist

**Pricing Controls:**
- Slider for base price: $0.01 to $5.00
- Surge multiplier: 1x to 10x with visual preview
- Live preview of current rates in accent color box

**Slot Configuration:**
- Number input with +/- buttons
- Time window selector: dropdown (hourly/daily/weekly)
- Visual calendar showing slot allocation

### Verification Badge
**Display:**
- Small shield icon with checkmark
- Appears next to usernames
- Tooltip on hover: "Verified human"
- Subtle glow effect in success green

**QR Code Modal (Mock for Now):**
- Center modal with QR code placeholder
- Instructions: "Scan with Self app to verify"
- Status: Not Verified → Verifying... → Verified
- Dismiss button

---

## Key Screens

### Compose Screen
- Full-page modal or drawer (mobile-first)
- Focus: Large textarea with character count
- Persistent price quote at bottom
- Send button: disabled until valid recipient + sufficient funds

### Inbox Screen
- Header: Attention slots indicator + filters
- Message list: Sorted by price (highest first) within available slots
- Empty state: Friendly illustration + "Your inbox is quiet" message
- Bottom: Auto-refund status for queued messages

### Message Detail
- Full message view with sender info
- Action buttons: Reply (with bounty option), Block sender, Report
- Payment info: Expandable section showing transaction details
- Reply textarea: Shows recipient's pricing if replying

### Settings Screen
- Tab navigation: Pricing, Slots, Verification, Privacy
- Each tab: Card-based layout with clear labels
- Save button: Sticky at bottom on mobile
- Changes preview: Show impact before saving

---

## Images & Illustrations

**Hero Section (Landing Page - if needed):**
- Abstract illustration of message bubbles with dollar signs flowing between people
- Warm gradient background (purple to blue)
- Style: Modern, slightly playful vector art

**Empty States:**
- Inbox empty: Mailbox illustration with friendly message
- No verification: Shield with question mark
- Settings welcome: Gear icon with sparkles

**Verification QR Placeholder:**
- Centered QR code graphic (400x400px)
- Scanning animation overlay when active
- Light border with corner markers

**No large hero image needed** - this is a utility app focused on messaging efficiency. Lead with the compose interface immediately after simple auth.

---

## Animations & Interactions

**Minimal Approach:**
- Price updates: Smooth number transitions (not jumpy)
- Message send: Quick fade-out with success feedback
- Slot filling: Progress bar fills smoothly
- Hover states: Subtle elevation changes (shadow depth)
- Loading states: Skeleton screens, not spinners

**Avoid:**
- Distracting confetti or celebration animations
- Auto-playing carousels
- Parallax scrolling
- Heavy transitions between screens

---

## Accessibility

- All interactive elements: min-height 44px (touch targets)
- Form inputs: Clearly labeled with associated text
- Color contrast: WCAG AA minimum (4.5:1 for text)
- Keyboard navigation: Full support with visible focus indicators
- Screen readers: Proper ARIA labels for dynamic price updates
- Dark mode: Default, with manual toggle option