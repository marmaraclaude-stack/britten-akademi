import { formatDateShort } from '@/lib/utils';

/**
 * Not gelişim çizgisi (0-100); tek seri, SVG.
 * dataviz kuralları: 2px çizgi, ≥8px işaret hedefi, kesikli olmayan ince
 * ızgara, seçici doğrudan etiket (ilk/son), tek seri olduğu için lejant yok.
 */
export function TrendLine({
  points,
  ariaLabel,
}: {
  points: Array<{ date: string; value: number }>;
  ariaLabel: string;
}) {
  if (points.length === 0) return null;

  const W = 560;
  const H = 180;
  const PAD = { top: 16, right: 24, bottom: 28, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xs = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const ys = (v: number) => PAD.top + innerH - (v / 100) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(p.value).toFixed(1)}`)
    .join(' ');

  const gridValues = [0, 50, 100];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Izgara */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={ys(v)}
              y2={ys(v)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={ys(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#898781"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Seri */}
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" />

        {points.map((p, i) => {
          const labeled = i === 0 || i === points.length - 1;
          return (
            <g key={`${p.date}-${i}`}>
              {/* Görünmez geniş vuruş hedefi + başlık ipucu */}
              <circle cx={xs(i)} cy={ys(p.value)} r={10} fill="transparent">
                <title>{`${formatDateShort(p.date)}: ${p.value}`}</title>
              </circle>
              <circle
                cx={xs(i)}
                cy={ys(p.value)}
                r={3.5}
                fill="#2a78d6"
                stroke="#fcfcfb"
                strokeWidth={2}
              />
              {labeled ? (
                <text
                  x={xs(i)}
                  y={ys(p.value) - 10}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={600}
                  fill="#0b0b0b"
                >
                  {p.value}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* X ekseni tarih etiketleri: ilk ve son */}
        <text
          x={xs(0)}
          y={H - 8}
          textAnchor="start"
          fontSize={11}
          fill="#898781"
        >
          {formatDateShort(points[0].date)}
        </text>
        {points.length > 1 ? (
          <text
            x={xs(points.length - 1)}
            y={H - 8}
            textAnchor="end"
            fontSize={11}
            fill="#898781"
          >
            {formatDateShort(points[points.length - 1].date)}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
