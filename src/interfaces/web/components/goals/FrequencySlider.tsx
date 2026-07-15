"use client";

/**
 * Weekly-frequency picker: a 1-7 slider with tick labels and a live value
 * readout. Replaces the old number input (which invited values like "07").
 * The hint line makes the commitment trade-off visible: more days per week
 * means a higher lock cost and zero slack at 7; fewer days means cheaper
 * locks and room to shuffle the schedule inside the week.
 */
export function FrequencySlider({
  value,
  onChange,
  showHint = false,
}: {
  value: number;
  onChange: (value: number) => void;
  showHint?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">Times per week</span>
        <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-bold text-brand">
          {value}×
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={7}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Times per week"
        className="mt-2 w-full accent-brand"
      />
      <div className="flex justify-between px-0.5 text-[10px] font-medium text-gray-400">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className={n === value ? "text-brand" : ""}>
            {n}
          </span>
        ))}
      </div>
      {showHint && (
        <p className="mt-1.5 text-xs text-gray-400">
          More days per week costs more locks. A scheduled day you skip always counts against the
          goal.
        </p>
      )}
    </div>
  );
}
