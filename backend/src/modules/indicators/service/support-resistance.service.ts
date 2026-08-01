import {
  RESISTANCE_DISTANCE_NEAR_PERCENT,
  SUPPORT_DISTANCE_NEAR_PERCENT,
  SUPPORT_DISTANCE_STRONG_WARNING_PERCENT,
  SUPPORT_RESISTANCE_TOUCH_TOLERANCE_PERCENT
} from '../constants/indicator.constants.js';
import {
  SupportColumnState,
  SupportResistanceStrength,
  SwingPoint
} from '../interfaces/indicator-result.interface.js';

export interface SupportResistanceInput {
  readonly price: number;
  readonly swings: readonly SwingPoint[];
}

export interface SupportResistanceResult {
  readonly nearestSupport: number | null;
  readonly nearestResistance: number | null;
  readonly supportDistancePercent: number | null;
  readonly resistanceDistancePercent: number | null;
  readonly supportStrength: SupportResistanceStrength;
  readonly resistanceStrength: SupportResistanceStrength;
  readonly supportColumnState: SupportColumnState;
}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class SupportResistanceService {
  public analyze(input: SupportResistanceInput): SupportResistanceResult {
    const supportCandidates = input.swings
      .filter((swing) => swing.label === 'LL' || swing.label === 'HL')
      .map((swing) => swing.price);
    const resistanceCandidates = input.swings
      .filter((swing) => swing.label === 'HH' || swing.label === 'LH')
      .map((swing) => swing.price);

    const nearestSupport = this.findNearestBelow(input.price, supportCandidates);
    const nearestResistance = this.findNearestAbove(input.price, resistanceCandidates);
    const supportDistancePercent = this.distancePercent(input.price, nearestSupport);
    const resistanceDistancePercent = this.distancePercent(input.price, nearestResistance);

    const supportStrength = this.resolveStrength(nearestSupport, supportCandidates);
    const resistanceStrength = this.resolveStrength(nearestResistance, resistanceCandidates);
    const supportColumnState = this.resolveSupportColumnState(supportDistancePercent, supportStrength);

    return {
      nearestSupport,
      nearestResistance,
      supportDistancePercent,
      resistanceDistancePercent,
      supportStrength,
      resistanceStrength,
      supportColumnState
    };
  }

  private findNearestBelow(price: number, levels: readonly number[]): number | null {
    const below = levels.filter((level) => level < price).sort((a, b) => b - a);
    return below[0] ?? null;
  }

  private findNearestAbove(price: number, levels: readonly number[]): number | null {
    const above = levels.filter((level) => level > price).sort((a, b) => a - b);
    return above[0] ?? null;
  }

  private distancePercent(price: number, level: number | null): number | null {
    if (level === null || price === 0) {
      return null;
    }

    return roundTo(((level - price) / price) * 100, 2);
  }

  private resolveStrength(targetLevel: number | null, levels: readonly number[]): SupportResistanceStrength {
    if (targetLevel === null) {
      return 'None';
    }

    const tolerance = targetLevel * (SUPPORT_RESISTANCE_TOUCH_TOLERANCE_PERCENT / 100);
    const touchCount = levels.filter((level) => Math.abs(level - targetLevel) <= tolerance).length;

    if (touchCount >= 3) {
      return 'Strong';
    }

    if (touchCount === 2) {
      return 'Medium';
    }

    if (touchCount === 1) {
      return 'Weak';
    }

    return 'None';
  }

  private resolveSupportColumnState(
    supportDistancePercent: number | null,
    supportStrength: SupportResistanceStrength
  ): SupportColumnState {
    if (supportDistancePercent === null) {
      return 'Clear';
    }

    const absDistance = Math.abs(supportDistancePercent);
    const nearThreshold = Math.max(SUPPORT_DISTANCE_NEAR_PERCENT, RESISTANCE_DISTANCE_NEAR_PERCENT);

    if (supportStrength === 'Strong' && absDistance <= SUPPORT_DISTANCE_STRONG_WARNING_PERCENT) {
      return 'Strong Support';
    }

    if (absDistance <= nearThreshold) {
      return 'Near';
    }

    return 'Clear';
  }
}
