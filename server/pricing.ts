import { User } from "@shared/schema";

export interface SurgePricingParams {
  basePrice: number;
  surgeAlpha: number;
  surgeK: number;
  humanDiscountPct: number;
  queuedMessages: number;
  slotsPerWindow: number;
}

export interface PriceQuote {
  priceUSD: string;
  humanDiscountApplied: boolean;
  surge: {
    utilization: number;
    floorUSD: string;
    multiplier: number;
  };
  requiresProof: boolean;
}

/**
 * Calculate dynamic surge pricing based on queue utilization
 * Formula: floor = basePrice * (1 + surgeAlpha * utilization^surgeK)
 */
export function calculateSurgePrice(params: SurgePricingParams, isHuman: boolean): PriceQuote {
  const {
    basePrice,
    surgeAlpha,
    surgeK,
    humanDiscountPct,
    queuedMessages,
    slotsPerWindow,
  } = params;

  // Calculate utilization (capped at 1.0)
  const utilization = Math.min(queuedMessages / Math.max(slotsPerWindow, 1), 1.0);

  // Calculate surge floor price
  const surgeFactor = 1 + surgeAlpha * Math.pow(utilization, surgeK);
  const floorPrice = basePrice * surgeFactor;

  // Apply human discount if verified
  const finalPrice = isHuman ? floorPrice * (1 - humanDiscountPct) : floorPrice;

  return {
    priceUSD: finalPrice.toFixed(2),
    humanDiscountApplied: isHuman,
    surge: {
      utilization: parseFloat(utilization.toFixed(2)),
      floorUSD: floorPrice.toFixed(2),
      multiplier: parseFloat(surgeFactor.toFixed(2)),
    },
    requiresProof: !isHuman,
  };
}

/**
 * Calculate price from user settings
 */
export function calculatePriceForUser(
  user: User,
  queuedMessages: number,
  isHuman: boolean = false
): PriceQuote {
  return calculateSurgePrice(
    {
      basePrice: parseFloat(user.basePrice),
      surgeAlpha: parseFloat(user.surgeAlpha),
      surgeK: parseFloat(user.surgeK),
      humanDiscountPct: parseFloat(user.humanDiscountPct),
      queuedMessages,
      slotsPerWindow: user.slotsPerWindow,
    },
    isHuman
  );
}
