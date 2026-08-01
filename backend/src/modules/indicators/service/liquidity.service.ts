import {
  LIQUIDITY_EQUAL_LEVEL_TOLERANCE_PERCENT,
  LIQUIDITY_NEAR_DISTANCE_PERCENT,
  LIQUIDITY_PREVIOUS_DAY_CANDLES
} from '../constants/indicator.constants.js';
import {
  LiquidityDirection,
  LiquidityZoneType,
  SwingPoint
} from '../interfaces/indicator-result.interface.js';

export interface LiquidityInput {
  readonly price: number;
  readonly highs: readonly number[];
  readonly lows: readonly number[];
  readonly swings: readonly SwingPoint[];
}

export interface LiquidityResult {
  readonly nearestLiquidityZone: LiquidityZoneType;
  readonly liquidityDirection: LiquidityDirection;
  readonly liquidityDistancePercent: number | null;
  readonly liquidityPressure: boolean;
}

interface LiquidityLevel {
  readonly type: LiquidityZoneType;
  readonly level: number;
}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class LiquidityService {
  public analyze(input: LiquidityInput): LiquidityResult {
    const levels = this.collectLiquidityLevels(input.highs, input.lows, input.swings);

    if (levels.length === 0) {
      return {
        nearestLiquidityZone: 'None',
        liquidityDirection: 'None',
        liquidityDistancePercent: null,
        liquidityPressure: false
      };
    }

    const nearest = levels
      .map((level) => ({
        ...level,
        distancePercent: this.distancePercent(input.price, level.level)
      }))
      .sort((left, right) => Math.abs(left.distancePercent) - Math.abs(right.distancePercent))[0];

    if (!nearest) {
      return {
        nearestLiquidityZone: 'None',
        liquidityDirection: 'None',
        liquidityDistancePercent: null,
        liquidityPressure: false
      };
    }

    const liquidityDirection = this.resolveDirection(nearest.distancePercent);
    const liquidityPressure = Math.abs(nearest.distancePercent) <= LIQUIDITY_NEAR_DISTANCE_PERCENT;

    return {
      nearestLiquidityZone: nearest.type,
      liquidityDirection,
      liquidityDistancePercent: roundTo(nearest.distancePercent, 2),
      liquidityPressure
    };
  }

  private collectLiquidityLevels(
    highs: readonly number[],
    lows: readonly number[],
    swings: readonly SwingPoint[]
  ): readonly LiquidityLevel[] {
    const levels: LiquidityLevel[] = [];

    const equalHigh = this.resolveEqualLevel(highs, 'high');
    if (equalHigh !== null) {
      levels.push({ type: 'Equal Highs', level: equalHigh });
    }

    const equalLow = this.resolveEqualLevel(lows, 'low');
    if (equalLow !== null) {
      levels.push({ type: 'Equal Lows', level: equalLow });
    }

    const daySliceHigh = highs.slice(-LIQUIDITY_PREVIOUS_DAY_CANDLES);
    const daySliceLow = lows.slice(-LIQUIDITY_PREVIOUS_DAY_CANDLES);
    if (daySliceHigh.length > 0) {
      levels.push({ type: 'Previous Day High', level: Math.max(...daySliceHigh) });
    }

    if (daySliceLow.length > 0) {
      levels.push({ type: 'Previous Day Low', level: Math.min(...daySliceLow) });
    }

    const lastSwingHigh = [...swings].reverse().find((swing) => swing.label === 'HH' || swing.label === 'LH');
    if (lastSwingHigh) {
      levels.push({ type: 'Swing High Liquidity', level: lastSwingHigh.price });
    }

    const lastSwingLow = [...swings].reverse().find((swing) => swing.label === 'LL' || swing.label === 'HL');
    if (lastSwingLow) {
      levels.push({ type: 'Swing Low Liquidity', level: lastSwingLow.price });
    }

    return levels;
  }

  private resolveEqualLevel(values: readonly number[], kind: 'high' | 'low'): number | null {
    const recent = values.slice(-20);
    if (recent.length < 4) {
      return null;
    }

    const sorted = kind === 'high' ? [...recent].sort((a, b) => b - a) : [...recent].sort((a, b) => a - b);
    const base = sorted[0];
    if (base === undefined || base === 0) {
      return null;
    }

    const tolerance = base * (LIQUIDITY_EQUAL_LEVEL_TOLERANCE_PERCENT / 100);
    const similarLevels = sorted.filter((value) => Math.abs(value - base) <= tolerance);

    if (similarLevels.length >= 2) {
      return similarLevels.reduce((total, value) => total + value, 0) / similarLevels.length;
    }

    return null;
  }

  private distancePercent(price: number, level: number): number {
    return ((level - price) / price) * 100;
  }

  private resolveDirection(distancePercent: number): LiquidityDirection {
    if (Math.abs(distancePercent) <= 0.05) {
      return 'At Price';
    }

    if (distancePercent > 0) {
      return 'Above';
    }

    return 'Below';
  }
}
