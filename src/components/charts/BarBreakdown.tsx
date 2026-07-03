/**
 * Yatay çubuk dökümü — seviye/bölüm doğruluk oranları.
 * dataviz kurallarına uygun: ince çubuklar, 4px yuvarlak uç, doğrudan etiket,
 * tek sekans mavisi (#2a78d6), metin her zaman metin renginde.
 */
export function BarBreakdown({
  rows,
}: {
  rows: Array<{ label: string; correct: number; total: number }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium text-ink">{r.label}</span>
              <span className="text-[13px] tabular-nums text-ink-secondary">
                {r.correct}/{r.total}
                <span className="ml-1.5 text-ink-muted">%{pct}</span>
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full bg-navy-100/70"
              role="img"
              aria-label={`${r.label}: ${r.total} soruda ${r.correct} doğru (%${pct})`}
            >
              <div
                className="h-2 rounded-full bg-[#2a78d6]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
