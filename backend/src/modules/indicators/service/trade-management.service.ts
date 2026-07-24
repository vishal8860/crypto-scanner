import {
  ExtensionState,
  ProfitTarget,
  RiskLevel,
  TradeState,
  TradeWarning,
  TrendAge,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TradeManagementInput {
  readonly eligible: boolean;
  readonly price: number;
  readonly entry: number | null;
  readonly stopLoss: number | null;
  readonly takeProfit: number | null;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly ema20SlopePercent: number;
  readonly trendScore: number;
  readonly entryScore: number;
  readonly trendStrengthScore: number;
  readonly trendAge: TrendAge;
  readonly riskReward: number | null;
  readonly volumeQuality: VolumeQuality;
  readonly extensionState: ExtensionState;
}

export interface TradeManagementResult {
  readonly tradeState: TradeState;
  readonly dynamicStopLoss: number | null;
  readonly stopLossStrategy: string;
  readonly profitTargets: readonly ProfitTarget[];
  readonly tradeProgressLabel: string;
  readonly tradeProgressR: number | null;
  readonly managementAdvice: string;
  readonly riskLevel: RiskLevel;
  readonly exitWarnings: readonly TradeWarning[];
  readonly professionalSummary: string;
}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class TradeManagementService {
  public evaluate(input: TradeManagementInput): TradeManagementResult {
    const riskPerUnit = this.resolveRiskPerUnit(input.entry, input.stopLoss);
    const progressR = this.resolveProgressR(input.price, input.entry, riskPerUnit);
    const progressLabel = this.resolveProgressLabel(input, progressR, riskPerUnit);
    const profitTargets = this.resolveProfitTargets(input.entry, input.takeProfit, riskPerUnit);
    const exitWarnings = this.resolveExitWarnings(input);
    const state = this.resolveTradeState(input, progressR, progressLabel, exitWarnings);
    const dynamicStop = this.resolveDynamicStop(input, progressR, state);
    const stopStrategy = this.resolveStopStrategy(input, progressR, state);
    const riskLevel = this.resolveRiskLevel(input);
    const advice = this.resolveAdvice(state, progressR, exitWarnings);

    return {
      tradeState: state,
      dynamicStopLoss: dynamicStop,
      stopLossStrategy: stopStrategy,
      profitTargets,
      tradeProgressLabel: progressLabel,
      tradeProgressR: progressR === null ? null : roundTo(progressR, 2),
      managementAdvice: advice,
      riskLevel,
      exitWarnings,
      professionalSummary: this.resolveSummary(input, riskLevel, advice)
    };
  }

  private resolveRiskPerUnit(entry: number | null, stopLoss: number | null): number | null {
    if (entry === null || stopLoss === null) {
      return null;
    }

    const risk = stopLoss - entry;
    return risk > 0 ? risk : null;
  }

  private resolveProgressR(price: number, entry: number | null, riskPerUnit: number | null): number | null {
    if (entry === null || riskPerUnit === null || riskPerUnit <= 0) {
      return null;
    }

    return (entry - price) / riskPerUnit;
  }

  private resolveProgressLabel(
    input: TradeManagementInput,
    progressR: number | null,
    riskPerUnit: number | null
  ): string {
    if (!input.eligible || input.entry === null || input.stopLoss === null) {
      return 'Waiting';
    }

    if (input.price > input.entry) {
      return 'Waiting';
    }

    if (input.price >= input.stopLoss) {
      return 'Stopped';
    }

    const tp3 = this.resolveTP3(input.entry, input.takeProfit, riskPerUnit);
    if (tp3 !== null && input.price <= tp3) {
      return 'Target Hit';
    }

    if (progressR === null || progressR < 0.1) {
      return 'Triggered';
    }

    return `+${roundTo(progressR, 1)}R`;
  }

  private resolveProfitTargets(
    entry: number | null,
    takeProfit: number | null,
    riskPerUnit: number | null
  ): readonly ProfitTarget[] {
    if (entry === null || riskPerUnit === null) {
      return [
        { label: 'TP1', price: null, rMultiple: null },
        { label: 'TP2', price: null, rMultiple: null },
        { label: 'TP3', price: null, rMultiple: null }
      ];
    }

    const tp1 = entry - riskPerUnit;
    const tp2 = entry - riskPerUnit * 2;
    const tp3 = this.resolveTP3(entry, takeProfit, riskPerUnit);

    return [
      { label: 'TP1', price: roundTo(tp1, 8), rMultiple: 1 },
      { label: 'TP2', price: roundTo(tp2, 8), rMultiple: 2 },
      {
        label: 'TP3',
        price: tp3 === null ? null : roundTo(tp3, 8),
        rMultiple: tp3 === null ? null : roundTo((entry - tp3) / riskPerUnit, 2)
      }
    ];
  }

  private resolveTP3(entry: number | null, takeProfit: number | null, riskPerUnit: number | null): number | null {
    if (entry === null || riskPerUnit === null) {
      return null;
    }

    if (takeProfit !== null) {
      return takeProfit;
    }

    return entry - riskPerUnit * 3;
  }

  private resolveExitWarnings(input: TradeManagementInput): readonly TradeWarning[] {
    const warnings: TradeWarning[] = [];

    if (Math.abs(input.ema20SlopePercent) < 0.06) {
      warnings.push({ severity: 'medium', message: 'EMA20 is flattening.' });
    }

    if (input.ema9 > input.ema20) {
      warnings.push({ severity: 'high', message: 'EMA9 crossed above EMA20.' });
    }

    if (input.volumeQuality === 'Poor') {
      warnings.push({ severity: 'high', message: 'Volume is fading sharply.' });
    } else if (input.volumeQuality === 'Average') {
      warnings.push({ severity: 'medium', message: 'Volume support is moderate.' });
    }

    if (input.trendStrengthScore < 5) {
      warnings.push({ severity: 'medium', message: 'Momentum is weakening.' });
    }

    if (input.price > input.ema200) {
      warnings.push({ severity: 'high', message: 'Price reclaimed EMA200.' });
    }

    return warnings;
  }

  private resolveTradeState(
    input: TradeManagementInput,
    progressR: number | null,
    progressLabel: string,
    exitWarnings: readonly TradeWarning[]
  ): TradeState {
    if (!input.eligible) {
      return 'Exit';
    }

    if (input.entry === null || input.stopLoss === null) {
      return 'Waiting';
    }

    if (progressLabel === 'Stopped' || progressLabel === 'Target Hit') {
      return 'Exit';
    }

    if (input.price > input.entry) {
      return 'Ready to Enter';
    }

    const hasCriticalWarning = exitWarnings.some((warning) => warning.severity === 'high');
    if (hasCriticalWarning && progressR !== null && progressR > 0) {
      return 'Exit';
    }

    if (progressR !== null && progressR >= 2) {
      return 'Trail Stop';
    }

    if (progressR !== null && progressR >= 1) {
      return 'Partial Profit';
    }

    return 'In Position';
  }

  private resolveDynamicStop(
    input: TradeManagementInput,
    progressR: number | null,
    tradeState: TradeState
  ): number | null {
    if (input.entry === null || input.stopLoss === null) {
      return input.stopLoss;
    }

    let stop = input.stopLoss;

    if (progressR !== null && progressR >= 1) {
      stop = Math.min(stop, input.entry);
    }

    if (progressR !== null && progressR >= 2) {
      const emaTrailStop = input.ema20 * 1.003;
      stop = Math.min(stop, emaTrailStop);
    }

    if (Math.abs(input.ema20SlopePercent) < 0.06 && tradeState !== 'Waiting' && tradeState !== 'Ready to Enter') {
      const tighterStop = input.price * 1.006;
      stop = Math.min(stop, tighterStop);
    }

    return roundTo(stop, 8);
  }

  private resolveStopStrategy(input: TradeManagementInput, progressR: number | null, tradeState: TradeState): string {
    if (input.entry === null || input.stopLoss === null) {
      return 'No active stop strategy until entry plan is available.';
    }

    if (tradeState === 'Waiting' || tradeState === 'Ready to Enter') {
      return 'Before entry: keep stop above the recent swing high.';
    }

    if (progressR !== null && progressR >= 2) {
      if (Math.abs(input.ema20SlopePercent) < 0.06) {
        return 'After +2R: trail above EMA20 and tighten because EMA20 is flattening.';
      }

      return 'After +2R: trail stop above EMA20.';
    }

    if (progressR !== null && progressR >= 1) {
      return 'After +1R: move stop to breakeven.';
    }

    if (input.ema9 > input.ema20) {
      return 'Exit warning active: EMA9 crossed above EMA20.';
    }

    return 'Maintain initial stop above swing high until +1R is reached.';
  }

  private resolveRiskLevel(input: TradeManagementInput): RiskLevel {
    let riskPoints = 0;

    if (input.riskReward === null || input.riskReward < 1.5) {
      riskPoints += 2;
    } else if (input.riskReward < 2) {
      riskPoints += 1;
    }

    if (input.trendStrengthScore < 5) {
      riskPoints += 2;
    } else if (input.trendStrengthScore < 7) {
      riskPoints += 1;
    }

    if (input.trendAge === 'Old') {
      riskPoints += 2;
    } else if (input.trendAge === 'Developing') {
      riskPoints += 1;
    }

    if (input.extensionState === 'Extended') {
      riskPoints += 2;
    } else if (input.extensionState === 'Slightly Extended') {
      riskPoints += 1;
    }

    if (input.volumeQuality === 'Poor') {
      riskPoints += 2;
    } else if (input.volumeQuality === 'Average') {
      riskPoints += 1;
    }

    if (riskPoints >= 7) {
      return 'High';
    }

    if (riskPoints >= 4) {
      return 'Medium';
    }

    return 'Low';
  }

  private resolveAdvice(
    tradeState: TradeState,
    progressR: number | null,
    warnings: readonly TradeWarning[]
  ): string {
    if (tradeState === 'Waiting') {
      return 'Wait for confirmation.';
    }

    if (tradeState === 'Ready to Enter') {
      return 'Enter now on confirmation candle.';
    }

    if (tradeState === 'Partial Profit') {
      return 'Take partial profits and move stop to breakeven.';
    }

    if (tradeState === 'Trail Stop') {
      return 'Trail using EMA20.';
    }

    if (tradeState === 'Exit') {
      return 'Exit trade.';
    }

    const criticalWarning = warnings.some((warning) => warning.severity === 'high');
    if (criticalWarning) {
      return 'Reduce risk and prepare to exit.';
    }

    if (progressR !== null && progressR > 0.8) {
      return 'Manage actively and protect gains.';
    }

    return 'Hold with initial stop.';
  }

  private resolveSummary(input: TradeManagementInput, riskLevel: RiskLevel, advice: string): string {
    const trendSentence = input.trendScore >= 80
      ? 'Strong bearish trend remains intact.'
      : 'Bearish trend is present but needs monitoring.';

    const entrySentence = input.entryScore >= 75
      ? 'Entry quality is high.'
      : 'Entry quality is moderate.';

    const riskSentence = riskLevel === 'Low'
      ? 'Risk is controlled.'
      : riskLevel === 'Medium'
        ? 'Risk is manageable with discipline.'
        : 'Risk is elevated and needs caution.';

    return `${trendSentence} ${entrySentence} ${riskSentence} ${advice}`;
  }
}
