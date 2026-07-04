// ============================================================
// Sparkline — 纯 SVG 折线/柱状图 (v0.35.2 板块趋势)
// 0 依赖,零 bundle
// ============================================================
"use client";

export interface TrendPoint {
  date: string;
  pv: number;
  uv: number;
}

export function Sparkline({
  points,
  height = 160
}: {
  points: TrendPoint[];
  height?: number;
}) {
  if (points.length === 0) {
    return null;
  }
  const width = 600;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };

  const maxPv = Math.max(1, ...points.map((p) => p.pv));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const toX = (i: number) => padding.left + i * stepX;
  const toY = (v: number) => padding.top + innerH - (v / maxPv) * innerH;

  const pvPolyline = points.map((p, i) => `${toX(i)},${toY(p.pv)}`).join(" ");
  const uvPolyline = points.map((p, i) => `${toX(i)},${toY(p.uv)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(maxPv * t).toString()
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`最近 ${points.length} 天 PV/UV 趋势`}
    >
      {/* 网格 + y 轴 tick */}
      {ticks.map((tk, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={padding.left + innerW}
            y1={tk.y}
            y2={tk.y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="2 4"
          />
          <text
            x={padding.left - 6}
            y={tk.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {tk.label}
          </text>
        </g>
      ))}

      {/* x 轴 date label (跳过避免拥挤) */}
      {points.map((p, i) => {
        const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
        const x = padding.left + i * stepX;
        const date = new Date(p.date).toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric"
        });
        return (
          <text
            key={p.date}
            x={x}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {date}
          </text>
        );
      })}

      {/* PV 折线 (实线 accent) */}
      <polyline
        points={pvPolyline}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-accent"
      />

      {/* UV 折线 (虚线 muted) */}
      <polyline
        points={uvPolyline}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        className="text-fg-muted"
      />

      {/* PV 点 */}
      {points.map((p, i) => {
        const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
        const x = padding.left + i * stepX;
        const yRatio = maxPv > 0 ? p.pv / maxPv : 0;
        const y = padding.top + innerH - yRatio * innerH;
        return (
          <circle
            key={`pv-${p.date}`}
            cx={x}
            cy={y}
            r={3}
            fill="currentColor"
            className="text-accent"
          >
            <title>
              {p.date} — PV: {p.pv} / UV: {p.uv}
            </title>
          </circle>
        );
      })}
    </svg>
  );
}
