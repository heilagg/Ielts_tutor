import { Card } from "@/components/ui/Card";
import type { ScorePrediction } from "@/lib/scoring/predict";

const TREND_LABEL: Record<ScorePrediction["trend"], string> = {
  improving: "Improving",
  flat: "Steady",
  declining: "Declining",
  insufficient_data: "Not enough data yet",
};

export function ScoreHeader({ prediction }: { prediction: ScorePrediction }) {
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round(((prediction.currentEstimate - 4) / (prediction.target - 4)) * 100))
  );

  return (
    <Card className="mb-6">
      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">IELTS {prediction.target.toFixed(1)} Target</p>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-5xl font-bold tabular-nums" style={{ color: "var(--color-primary-2)" }}>
          {prediction.currentEstimate.toFixed(1)}
        </span>
        <span className="text-sm text-[var(--color-text-muted)] mb-2">
          / {prediction.target.toFixed(1)} target · gap {Math.max(0, prediction.gap).toFixed(1)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-band-track)] overflow-hidden mb-2">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>{progressPct}% of the way to target</span>
        <span>
          Trend: {TREND_LABEL[prediction.trend]}
          {prediction.trendDeltaPerMonth != null && prediction.trend !== "insufficient_data"
            ? ` (${prediction.trendDeltaPerMonth > 0 ? "+" : ""}${prediction.trendDeltaPerMonth.toFixed(2)}/mo)`
            : ""}
        </span>
      </div>
      {prediction.readinessProbability != null && (
        <p className="text-xs text-[var(--color-text-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
          Estimated readiness: <span className="font-medium text-[var(--color-text)]">{Math.round(prediction.readinessProbability * 100)}%</span> —{" "}
          {prediction.readinessLabel}
        </p>
      )}
    </Card>
  );
}
