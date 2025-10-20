import PriceQuote from '../PriceQuote'

export default function PriceQuoteExample() {
  return (
    <div className="space-y-4">
      <PriceQuote verifiedPrice={0.02} unverifiedPrice={0.15} isVerified={true} />
      <PriceQuote verifiedPrice={0.02} unverifiedPrice={0.15} isVerified={false} />
      <PriceQuote verifiedPrice={0.05} unverifiedPrice={0.35} isVerified={false} surgeMultiplier={2.5} />
    </div>
  )
}
