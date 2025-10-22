# x4pp Manual Testing Guide

## Prerequisites

### Required Setup:
1. **Two Celo Wallets** with the following:
   - MetaMask (or compatible wallet) configured for **Celo Mainnet**
   - Each wallet needs:
     - Small amount of CELO for gas (~0.1 CELO minimum)
     - USDC for testing bids (~5-10 USDC recommended)
   
2. **Network Configuration:**
   - Network Name: Celo Mainnet
   - RPC URL: `https://forno.celo.org`
   - Chain ID: `42220`
   - Currency Symbol: CELO
   - Block Explorer: https://celoscan.io

3. **Environment Secrets Verified:**
   - `CELO_RPC_URL` - Should be set to Forno RPC
   - `PAYMENT_WALLET_PRIVATE_KEY` - Backend relayer wallet for settlements
   - `PAYMENT_WALLET_ADDRESS` - Corresponding address
   - `SESSION_SECRET` - For session management

### Getting Test USDC on Celo:
- **Option 1:** Bridge from another chain using [Portal Bridge](https://portalbridge.com/)
- **Option 2:** Use [Mento Exchange](https://mento.org/) to swap CELO → cUSD → USDC
- **Option 3:** Get from a DEX like [Ubeswap](https://app.ubeswap.org/)

---

## Test Flow Overview

```
Wallet A (Sender)         →  sends bid  →         Wallet B (Receiver)
   ↓                                                      ↓
Register as "alice"                              Register as "bob"
Set min bid: $0.05                               Set min bid: $0.10
   ↓                                                      ↓
Compose message to "bob"                         View /inbox
See price guide                                  See pending bid
Enter bid: $0.25                                 Accept or Decline
Sign EIP-3009 auth                              Settlement happens
Message pending                                  USDC received
```

---

## Test Scenario 1: User Registration

### For Both Wallets:

**Steps:**
1. Navigate to app homepage
2. Click "Connect Wallet" or go to `/register`
3. Connect Wallet A (for alice)
4. Fill registration form:
   - **Username:** `alice` (must be unique)
   - **Minimum Bid:** `$0.05`
   - **SLA Hours:** `24`
5. Click "Register"

**Expected Results:**
- ✅ Auto-login after registration
- ✅ Session cookie created
- ✅ Redirected to `/app` or home
- ✅ Username displayed in UI

**Verify in Database:**
```sql
SELECT username, "walletAddress", "minBasePrice", "slaHours" 
FROM users 
WHERE username = 'alice';
```

**Repeat for Wallet B:**
- Username: `bob`
- Min bid: `$0.10`
- SLA: `48` hours

### Common Issues:
- ❌ **"Username already exists"** → Try different username
- ❌ **Wallet not detected** → Check MetaMask is unlocked and on Celo network
- ❌ **Session not persisting** → Check SESSION_SECRET is set

---

## Test Scenario 2: Settings Management

**Steps:**
1. Login as alice
2. Navigate to `/profile` or settings page
3. Update minimum bid to `$0.08`
4. Click "Save Settings"

**Expected Results:**
- ✅ Success toast appears
- ✅ Settings persist after page refresh
- ✅ New min bid enforced on incoming messages

**Verify:**
```sql
SELECT "minBasePrice" FROM users WHERE username = 'alice';
-- Should return 0.08
```

---

## Test Scenario 3: Price Discovery (Happy Path)

**Steps (as alice):**
1. Navigate to `/app` (compose page)
2. Connect wallet (should auto-detect alice's session)
3. Enter recipient username: `bob`
4. Wait for price guide to load

**Expected Results:**
- ✅ Price guide displays:
  - **Minimum:** $0.10 (bob's minBasePrice)
  - **Typical:** Calculated from bob's pending bids
  - **High:** P75 of bob's pending bids
- ✅ Quick bid buttons appear (Min / Typical / High)
- ✅ Bid input pre-filled with median value

**Verify Network Request:**
- Check browser DevTools → Network tab
- Should see: `GET /api/price-guide/bob`
- Response should contain: `{ minBaseUSD, p25, median, p75, sampleSize }`

### Edge Case: No Pending Bids
If bob has no pending messages:
- Price guide should show only `minBaseUSD`
- Typical/High may fall back to recent accepted messages or show same as minimum

---

## Test Scenario 4: Send Message (EIP-3009 Flow)

**Steps (as alice → bob):**
1. Still on compose page with bob as recipient
2. Enter message content: `"Hello Bob! Test message."`
3. Enter bid amount: `$0.25` (above bob's $0.10 minimum)
4. Optional: Add reply bounty `$0.05`
5. Click "Send Message"

**Expected Behavior (402 Round-Trip):**

**First API Call (No Payment):**
- Request: `POST /api/commit`
- Body: `{ recipientUsername: "bob", content: "Hello...", bidUsd: "0.25" }`
- Response: **402 Payment Required** with payment requirements

**Wallet Signature Prompt:**
- MetaMask shows "Sign typed data" (not a transaction)
- Message shows: Transfer 250000 USDC (0.25 * 10^6 microunits)
- To address: bob's walletAddress
- validAfter: current timestamp
- validBefore: current time + 24 hours (bob's SLA)

**Second API Call (With Signature):**
- Request: `POST /api/commit`
- Headers: `X-PAYMENT: { from, to, value, validAfter, validBefore, nonce, v, r, s }`
- Response: `{ messageId, status: "pending", expiresAt }`

**Expected Results:**
- ✅ Success toast: "Message sent! Pending acceptance."
- ✅ No USDC leaves alice's wallet yet
- ✅ Message appears in bob's pending inbox

**Verify in Database:**
```sql
-- Check message created
SELECT id, "senderNullifier", "recipientNullifier", content, "bidUsd", status, "expiresAt"
FROM messages 
WHERE content LIKE '%Hello Bob%';

-- Check payment authorization stored
SELECT "messageId", amount, nonce, signature, status
FROM payments
WHERE "messageId" = <message_id_from_above>;
```

Expected:
- messages.status = 'pending'
- payments.status = 'authorized'
- payments.signature includes v, r, s components

### Common Issues:
- ❌ **"Bid below minimum"** → Increase bid to meet bob's minBasePrice
- ❌ **"Recipient not found"** → Check username spelling
- ❌ **Signature rejected** → Verify wallet is alice's registered wallet
- ❌ **"Wrong recipient address"** → Backend security check - signature must go to bob's wallet

---

## Test Scenario 5: View Pending Messages (Receiver)

**Steps (as bob):**
1. Logout from alice (or use incognito/different browser)
2. Connect wallet B
3. Login as bob (should auto-login if wallet matches)
4. Navigate to `/inbox`

**Expected Results:**
- ✅ Pending messages list loads
- ✅ Alice's message appears at top (highest bid first)
- ✅ Shows:
  - Sender: "alice"
  - Bid: "$0.25"
  - Message preview
  - Time remaining (e.g., "Expires in 23h 58m")
  - Accept / Decline buttons

**Verify Network Request:**
- `GET /api/messages/pending`
- Response: Array of pending messages sorted by bidUsd DESC

---

## Test Scenario 6: Accept Message (Settlement)

**Steps (as bob):**
1. On `/inbox` page
2. Click "Accept" on alice's message
3. Wait for transaction confirmation

**Expected Behavior:**

**Backend Process:**
1. Loads message + payment from DB (row-level lock)
2. Replays EIP-3009 authorization:
   ```solidity
   transferWithAuthorization(
     from: alice's wallet,
     to: bob's wallet,
     value: 250000, // 0.25 USDC
     validAfter: <from stored auth>,
     validBefore: <from stored auth>,
     nonce: <from stored auth>,
     v, r, s: <from signature>
   )
   ```
3. Submits transaction using backend relayer wallet (PAYMENT_WALLET_PRIVATE_KEY)
4. Waits for confirmation
5. Updates DB:
   - messages.status = 'accepted'
   - messages.acceptedAt = now()
   - payments.status = 'settled'
   - payments.txHash = <transaction_hash>

**Expected Results:**
- ✅ Success toast: "Message accepted! Payment settled."
- ✅ Message removed from pending list
- ✅ USDC appears in bob's wallet (+$0.25)
- ✅ Transaction visible on [Celoscan](https://celoscan.io)

**Verify:**

**In Wallet:**
- Bob's USDC balance increased by $0.25
- Check MetaMask → Assets → USDC

**On Blockchain:**
- Visit: `https://celoscan.io/tx/<txHash>`
- Should show: transferWithAuthorization call to USDC contract
- From: alice's address
- To: bob's address
- Value: 250000 (0.25 * 10^6)

**In Database:**
```sql
SELECT status, "acceptedAt", "declinedAt" 
FROM messages 
WHERE id = <message_id>;
-- status should be 'accepted'

SELECT status, "txHash"
FROM payments
WHERE "messageId" = <message_id>;
-- status should be 'settled', txHash should be populated
```

### Common Issues:
- ❌ **"Authorization expired"** → validBefore timestamp passed, message auto-expires
- ❌ **"Invalid signature"** → Signature components (v,r,s) corrupted or validAfter/validBefore mismatch
- ❌ **Gas failure** → Backend relayer wallet needs CELO for gas
- ❌ **Insufficient USDC** → Alice's wallet doesn't have enough USDC (shouldn't happen if sig verified earlier)
- ❌ **Double-accept** → Row lock should prevent this, but check logs for race conditions

---

## Test Scenario 7: Decline Message (No Settlement)

**Setup:**
Create another pending message from alice to bob (repeat Scenario 4 with different content)

**Steps (as bob):**
1. On `/inbox` page
2. Click "Decline" on the new message
3. Confirm decline

**Expected Behavior:**
1. Backend updates DB only (no blockchain interaction):
   - messages.status = 'declined'
   - messages.declinedAt = now()
   - payments.status = 'unused'
2. No `txHash` recorded

**Expected Results:**
- ✅ Success toast: "Message declined"
- ✅ Message removed from pending list
- ✅ No USDC transferred (alice keeps her funds)
- ✅ Authorization expires naturally (can't be used later)

**Verify:**
```sql
SELECT status, "declinedAt" FROM messages WHERE id = <message_id>;
-- status = 'declined', declinedAt is populated

SELECT status, "txHash" FROM payments WHERE "messageId" = <message_id>;
-- status = 'unused', txHash is NULL
```

**In Alice's Wallet:**
- USDC balance unchanged (still has the $0.25)

---

## Test Scenario 8: Auto-Expiry (Background Worker)

**Setup:**
1. Create a new user with very short SLA: `charlie` with slaHours = `1`
2. Alice sends message to charlie with bid
3. Wait for expiry (or manually update DB for faster testing)

**Manual Expiry Test (Fast):**
```sql
-- Artificially expire a pending message
UPDATE messages 
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE status = 'pending' AND id = <message_id>;
```

**Wait for Worker:**
- Refund monitor runs every 5 minutes
- Check server logs for: `[Refunds] Found X expired pending messages`

**Expected Results:**
- ✅ Message status changed to 'expired'
- ✅ Payment status changed to 'unused'
- ✅ No on-chain transaction
- ✅ Sender's funds remain in wallet

**Verify Logs:**
```
[Refunds] Found 1 expired pending messages
[Refunds] Processing expired message <id>
[Refunds] Refunded payment <paymentId> with reason: expired
```

**Verify Database:**
```sql
SELECT status FROM messages WHERE id = <message_id>;
-- Should be 'expired'

SELECT status FROM payments WHERE "messageId" = <message_id>;
-- Should be 'unused'
```

---

## Test Scenario 9: Edge Cases

### A. Bid Below Minimum
**Steps:**
1. Alice tries to send bob a message with bid $0.05 (bob's minimum is $0.10)

**Expected:**
- ❌ Backend rejects: "Bid must be at least $0.10"
- ❌ 400 Bad Request
- ❌ No message created

### B. Invalid Recipient
**Steps:**
1. Alice enters recipient: `nonexistent_user`

**Expected:**
- ❌ "Recipient not found"
- ❌ 404 Not Found

### C. Wallet Mismatch
**Steps:**
1. Alice is logged in
2. Switches to different wallet in MetaMask (Wallet C)
3. Tries to send message

**Expected:**
- ❌ Signature verification fails (from address doesn't match alice's registered wallet)
- ❌ "Payment authorization invalid"

### D. Accept Same Message Twice
**Steps:**
1. Bob accepts a message
2. Refresh page quickly and try to accept again (race condition test)

**Expected:**
- ✅ Row lock prevents double-accept
- ❌ Second attempt: "Message not found" or "Already accepted"
- ✅ Only one transaction on blockchain

### E. Expired Authorization
**Steps:**
1. Create message with 1-hour SLA
2. Wait 1+ hours
3. Try to accept

**Expected:**
- ❌ On-chain call reverts: "Authorization expired"
- ✅ Backend marks as expired
- ❌ No USDC transferred

---

## Debugging Checklist

### If messages don't appear in inbox:
1. Check database: `SELECT * FROM messages WHERE status = 'pending';`
2. Verify recipient username matches exactly
3. Check API response: `/api/messages/pending`
4. Clear React Query cache (DevTools → Application → Storage)

### If payment settlement fails:
1. Check backend logs for error message
2. Verify PAYMENT_WALLET_PRIVATE_KEY has CELO for gas
3. Check Celoscan for reverted transactions
4. Verify signature components stored correctly:
   ```sql
   SELECT signature FROM payments WHERE "messageId" = <id>;
   ```
5. Ensure validAfter/validBefore are stored and replayed exactly

### If price guide doesn't load:
1. Check network tab: `/api/price-guide/:username` response
2. Verify recipient exists in database
3. Check for pending bids: `SELECT * FROM messages WHERE "recipientNullifier" = <nullifier> AND status = 'pending';`

### If auto-expiry doesn't work:
1. Check server logs for refund worker output
2. Verify worker is running: Look for "Starting refund monitor"
3. Manually trigger: Find expired messages and check DB

---

## Success Criteria

✅ **Registration Flow:**
- Both users registered successfully
- Wallets bound correctly
- Settings persist across sessions

✅ **Bidding Flow:**
- Price guide shows accurate data
- Bids submit successfully
- EIP-3009 signatures generated correctly
- Funds remain in sender's wallet

✅ **Settlement Flow:**
- Accept executes on-chain transfer
- USDC arrives in receiver's wallet
- Transaction hash recorded
- Message marked accepted

✅ **Decline Flow:**
- No on-chain transaction
- Authorization marked unused
- Funds stay with sender

✅ **Expiry Flow:**
- Worker detects expired messages
- Marks them as unused
- No on-chain activity

✅ **Security:**
- Can't accept below minimum bid
- Can't swap recipient address
- Can't double-accept messages
- Row locks prevent race conditions

---

## Next Steps After Testing

1. **Document Issues:**
   - Create GitHub issues for any bugs found
   - Note UX improvements needed

2. **Performance Testing:**
   - Test with multiple pending messages (10+)
   - Check query performance on inbox

3. **Real User Testing:**
   - Invite 2-3 trusted users
   - Observe real usage patterns
   - Gather feedback on pricing dynamics

4. **Add Monitoring:**
   - Set up alerts for failed settlements
   - Track acceptance rates
   - Monitor gas costs

5. **Consider Hardening (from ChatGPT plan):**
   - Add blocklist functionality
   - Implement withdraw bid feature
   - Add rate limiting
   - Deploy to production after successful tests
