import { CalendarClock, Timer, Gauge, AlertTriangle } from "lucide-react";
import { date, perDay } from "@/lib/format";

/** Target date + slip days; real-pace ETA + required pace. */
export function Clock({
  effectiveTarget,
  delayDays,
  daysUntilTarget,
  paceETA,
  reqPace,
  velocity,
}: {
  effectiveTarget: string;
  delayDays: number;
  daysUntilTarget: number;
  paceETA: string | null;
  reqPace: number;
  velocity: number;
}) {
  const onTrack = paceETA !== null && paceETA <= effectiveTarget;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="panel p-4">
        <div className="label flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Target date
        </div>
        <div className="num mt-1 text-lg text-cyan">{date(effectiveTarget)}</div>
        <div className="mt-1 text-xs text-white/45">
          {daysUntilTarget >= 0
            ? `${daysUntilTarget} days out`
            : `${Math.abs(daysUntilTarget)} days overdue`}
          {delayDays > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-danger">
              <AlertTriangle className="h-3 w-3" /> +{delayDays} slipped
            </span>
          )}
        </div>
      </div>

      <div className="panel p-4">
        <div className="label flex items-center gap-2">
          <Timer className="h-4 w-4" /> Real-pace ETA
        </div>
        <div
          className={`num mt-1 text-lg ${
            paceETA ? (onTrack ? "text-accent" : "text-gold") : "text-danger"
          }`}
        >
          {paceETA ? date(paceETA) : "Not moving"}
        </div>
        <div className="mt-1 text-xs text-white/45">
          velocity {perDay(velocity)}
        </div>
      </div>

      <div className="panel p-4">
        <div className="label flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Required pace
        </div>
        <div className="num mt-1 text-lg text-gold">{perDay(reqPace)}</div>
        <div className="mt-1 text-xs text-white/45">to hit base target</div>
      </div>
    </div>
  );
}
