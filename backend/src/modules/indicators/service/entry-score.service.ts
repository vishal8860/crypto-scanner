import {
  ENTRY_SUPPORT_RISK_PENALTY,
  ENTRY_QUALITY_RR_HIGH,
  ENTRY_QUALITY_RR_LOW,
  ENTRY_QUALITY_RR_MEDIUM,
  ENTRY_SCORE_DEVELOPING_MIN,
  ENTRY_SCORE_READY_MIN,
  ENTRY_SCORE_WATCH_MIN,
  SCORE_MAX,
  SCORE_MIN
} from '../constants/indicator.constants.js';
import { EntryGrade, TradeStage } from '../interfaces/indicator-result.interface.js';

export interface EntryScoreInput {
  readonly tradeStage: TradeStage;
  readonly distanceFromEMA20Percent: number;
  readonly riskReward: number | null;
  readonly suggestedEntry: number | null;
  readonly suggestedStopLoss: number | null;
  readonly suggestedTakeProfit: number | null;
  readonly price: number;
  readonly marketStructureEntryCap: number | null;
  readonly pullbackQualityScore: number;
  readonly hasRetest: boolean;
  readonly bearishRejectionAfterRetest: boolean;
  readonly supportDistancePercent: number | null;
  readonly supportAlreadyBroken: boolean;
}

export interface EntryScoreResult {
  readonly entryScore: number;
  readonly entryGrade: EntryGrade;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class EntryScoreService {
  public score(input: EntryScoreInput): EntryScoreResult {
    let score = 0;

    score += this.stageContribution(input.tradeStage);
    score += this.distanceToEMA20Contribution(input.distanceFromEMA20Percent);
    score += this.pullbackQualityContribution(input.pullbackQualityScore);
    score += this.riskRewardContribution(input.riskReward);
    score += this.candleExtensionPenalty(input.distanceFromEMA20Percent);
    score += this.supportProximityContribution(input.suggestedEntry, input.suggestedTakeProfit, input.price);

    if (!input.hasRetest) {
      score -= 15;
    }

    if (input.hasRetest && !input.bearishRejectionAfterRetest) {
      score -= 8;
    }

    score += this.supportRiskPenalty({
      suggestedEntry: input.suggestedEntry,
      suggestedStopLoss: input.suggestedStopLoss,
      supportDistancePercent: input.supportDistancePercent,
      supportAlreadyBroken: input.supportAlreadyBroken
    });

    if (input.suggestedEntry === null) {
      score -= 25;
    }

    const cappedMax = input.marketStructureEntryCap === null
      ? SCORE_MAX
      : Math.max(SCORE_MIN, Math.min(SCORE_MAX, input.marketStructureEntryCap));
    const entryScore = roundTo(clamp(score, SCORE_MIN, cappedMax), 2);

    return {
      entryScore,
      entryGrade: this.resolveGrade(entryScore)
    };
  }

  private stageContribution(stage: TradeStage): number {
    if (stage === 'EARLY_BREAKDOWN') {
      return 22;
    }

    if (stage === 'PULLBACK_ENTRY') {
      return 26;
    }

    if (stage === 'TREND_CONTINUATION') {
      return 14;
    }

    if (stage === 'LATE_TREND') {
      return 6;
    }

    return 0;
  }

  private distanceToEMA20Contribution(distanceFromEMA20Percent: number): number {
    const distance = Math.abs(distanceFromEMA20Percent);

    if (distance <= 0.4) {
      return 18;
    }

    if (distance <= 1) {
      return 14;
    }

    if (distance <= 2) {
      return 8;
    }

    return 2;
  }

  private pullbackQualityContribution(pullbackQualityScore: number): number {
    if (pullbackQualityScore >= 80) {
      return 22;
    }

    if (pullbackQualityScore >= 65) {
      return 16;
    }

    if (pullbackQualityScore >= 45) {
      return 10;
    }

    return 2;
  }

  private riskRewardContribution(riskReward: number | null): number {
    if (riskReward === null) {
      return 0;
    }

    if (riskReward > ENTRY_QUALITY_RR_HIGH) {
      return 22;
    }

    if (riskReward >= ENTRY_QUALITY_RR_MEDIUM) {
      return 16;
    }

    if (riskReward >= ENTRY_QUALITY_RR_LOW) {
      return 9;
    }

    return 2;
  }

  private candleExtensionPenalty(distanceFromEMA20Percent: number): number {
    const distance = Math.abs(distanceFromEMA20Percent);

    if (distance > 3) {
      return 12;
    }

    if (distance > 2) {
      return 8;
    }

    if (distance > 1.2) {
      return 4;
    }

    return 0;
  }

  private supportProximityContribution(
    suggestedEntry: number | null,
    suggestedTakeProfit: number | null,
    price: number
  ): number {
    if (suggestedEntry === null || suggestedTakeProfit === null || price <= 0) {
      return 0;
    }

    const targetDistancePercent = Math.abs(((suggestedEntry - suggestedTakeProfit) / price) * 100);

    if (targetDistancePercent >= 2) {
      return 8;
    }

    if (targetDistancePercent >= 1) {
      return 5;
    }

    return 2;
  }

  private supportRiskPenalty(input: {
    readonly suggestedEntry: number | null;
    readonly suggestedStopLoss: number | null;
    readonly supportDistancePercent: number | null;
    readonly supportAlreadyBroken: boolean;
  }): number {
    if (input.supportAlreadyBroken) {
      return 0;
    }

    if (input.supportDistancePercent === null) {
      return 0;
    }

    const supportRoomPercent = Math.abs(Math.min(0, input.supportDistancePercent));
    if (supportRoomPercent === 0) {
      return 0;
    }

    const oneRPercent =
      input.suggestedEntry !== null &&
      input.suggestedStopLoss !== null &&
      input.suggestedEntry > 0
        ? Math.abs(((input.suggestedStopLoss - input.suggestedEntry) / input.suggestedEntry) * 100)
        : 1;

    if (supportRoomPercent < oneRPercent) {
      return -ENTRY_SUPPORT_RISK_PENALTY;
    }

    return 0;
  }

  private resolveGrade(score: number): EntryGrade {
    if (score >= ENTRY_SCORE_READY_MIN) {
      return 'Ready';
    }

    if (score >= ENTRY_SCORE_WATCH_MIN) {
      return 'Watch';
    }

    if (score >= ENTRY_SCORE_DEVELOPING_MIN) {
      return 'Developing';
    }

    return 'Poor';
  }
}
