# Token Balance Display

This document describes the token balance functionality added to the Hedron Frontend application.

## Features

### Token Balance Display
- Shows user's token balances in the header when wallet is connected
- Displays token icons, amounts, and USD values
- Updates automatically when wallet connects/disconnects
- Supports both compact and full display modes

### Supported Tokens

#### HBAR (Native Hedera Token)
- **Token ID**: `HBAR`
- **Decimals**: 8
- **Icon**: `/hedera-hbar-logo.png`

#### SAUCE (SaucerSwap Token)
- **Token ID**: `0.0.731861`
- **Decimals**: 6  
- **Icon**: `/SauceIcon.png`
- **Network**: Both mainnet and testnet

#### USDC (USD Coin)
- **Token ID**: `0.0.456858` (testnet example - needs verification)
- **Decimals**: 6
- **Icon**: External URL to USDC logo

#### BONZO (Community Token)
- **Token ID**: `0.0.123456` (placeholder - needs actual testnet token ID)
- **Decimals**: 8
- **Icon**: `/bonzo-outline.png`

## Technical Implementation

### Data Sources

#### Balance Data
- **Source**: Hedera Mirror Node REST API
- **Testnet Endpoint**: `https://testnet.mirrornode.hedera.com/api/v1`
- **Mainnet Endpoint**: `https://mainnet.mirrornode.hedera.com/api/v1`
- **API Endpoint**: `/accounts/{accountId}`

#### Price Data
- **Primary Source**: CoinGecko API
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`
- **Supported Tokens**: HBAR (`hedera-hashgraph`), SAUCE (`saucerswap`)
- **Fallback**: Static fallback prices for development
- **Update Frequency**: Every 5 minutes

### Components

#### `useTokenBalances` Hook
- Fetches account balances from Hedera Mirror Node
- Fetches real-time prices from CoinGecko
- Handles loading states and error handling
- Automatically refetches when account changes
- Updates prices periodically

#### `TokenBalances` Component
- Displays token balances with icons and USD values
- Supports compact mode for headers
- Shows total portfolio value
- Includes refresh functionality
- Handles image loading errors with fallback icons

## Configuration

### Adding New Tokens

To add support for a new token:

1. **Update Token Definitions** in `src/hooks/useTokenBalances.ts`:
```typescript
NEWTOK: {
  id: '0.0.XXXXXX', // Hedera token ID
  name: 'New Token',
  symbol: 'NEWTOK',
  decimals: 8,
  icon: '/path-to-icon.png'
}
```

2. **Add Price Mapping** (if available on CoinGecko):
```typescript
// In fetchTokenPrices function
if (coingeckoData['token-id-on-coingecko']?.usd) {
  prices.NEWTOK = coingeckoData['token-id-on-coingecko'].usd
}
```

3. **Add Fallback Price**:
```typescript
if (!prices.NEWTOK) prices.NEWTOK = 0.001 // Fallback price
```

### Environment Variables

- `VITE_HEDERA_NETWORK`: Set to `testnet` or `mainnet` to configure the appropriate Mirror Node endpoint

## API Limits and Considerations

### Hedera Mirror Node
- **Public Rate Limit**: 50 requests per second per IP
- **No Authentication**: Required for public endpoints
- **Availability**: High uptime, managed by Hedera

### CoinGecko API
- **Free Tier**: 10-30 calls per minute
- **Rate Limiting**: Implemented with fallback prices
- **Error Handling**: Graceful degradation to cached/fallback prices

## Development Notes

### Token ID Verification
- SAUCE token ID `0.0.731861` is verified for both mainnet and testnet
- USDC and BONZO token IDs are placeholders and need verification for testnet
- Always verify token IDs before production deployment

### Icon Assets
- Token icons should be placed in the `public/` directory
- Fallback icons are generated dynamically using SVG with token symbol
- External icons (like USDC) are loaded from CDNs with fallback handling

### Error Handling
- Network failures gracefully degrade to cached/fallback data
- Invalid token IDs are filtered out automatically
- Image loading errors show generated fallback icons

## Troubleshooting

If tokens are not appearing:

1. **Check Debug Console**: Open browser DevTools (F12) and look for logs starting with 🔍
2. **Use Debug Tool**: Click the "Debug Tokens" button (only in development) to see all tokens in your account
3. **Verify Account Association**: Ensure your account is associated with the tokens you expect
4. **Check Token IDs**: Verify token IDs are correct for testnet/mainnet
5. **Confirm Balance**: Ensure tokens have non-zero balances
6. **Check Network**: Make sure you're connected to the correct network (testnet/mainnet)

### Debug Information

The debug tool shows:
- **Token ID**: The actual token identifier from the Mirror Node API
- **Balance**: The raw balance value
- **Raw data**: Complete JSON structure for troubleshooting

### Common Issues

- **Token ID undefined**: Mirror Node API structure may have changed
- **Zero balances**: Tokens with 0 balance are filtered out
- **Network mismatch**: Wrong token IDs for the current network

Common testnet token IDs can be found at:
- HashScan Testnet: https://hashscan.io/testnet
- SaucerSwap Docs: https://docs.saucerswap.finance/

## Future Enhancements

1. **Additional Price Sources**: Integrate DEX price feeds for tokens not on CoinGecko
2. **Historical Data**: Add price change indicators (24h %)
3. **Portfolio Tracking**: Track total portfolio value over time
4. **Custom Tokens**: Allow users to add custom token addresses
5. **Price Alerts**: Notify users of significant price changes
6. **DeFi Integration**: Show staked/locked token amounts from protocols