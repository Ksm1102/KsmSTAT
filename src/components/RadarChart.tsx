import React, { useState } from 'react';
import { CORE_STATS } from '../data/presets';
import { CoreStatKey, CoreStatsMap } from '../types/statup';

interface RadarChartProps {
  stats: CoreStatsMap;
}

export const RadarChart: React.FC<RadarChartProps> = ({ stats }) => {
  const [hoveredKey, setHoveredKey] = useState<CoreStatKey | null>(null);

  const size = 320;
  const center = size / 2;
  const maxRadius = 104;

  // Dynamic scale ceiling so chart scales smoothly from 0
  const maxStatValue = Math.max(40, ...Object.values(stats));
  const scaleCeiling = Math.ceil(maxStatValue / 25) * 25;

  const angleStep = (Math.PI * 2) / CORE_STATS.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, valueRatio: number) => {
    const angle = startAngle + index * angleStep;
    const r = maxRadius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const rings = [0.25, 0.5, 0.75, 1];

  const dataPoints = CORE_STATS.map((stat, idx) => {
    const val = stats[stat.key] ?? 0;
    const ratio = Math.min(1, val / scaleCeiling);
    return {
      ...stat,
      value: val,
      point: getPoint(idx, ratio),
      labelPoint: getPoint(idx, 1.24),
    };
  });

  const polygonPoints = dataPoints.map((d) => `${d.point.x},${d.point.y}`).join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[300px] h-auto overflow-visible select-none"
        role="img"
        aria-label="5대 핵심 능력치 레이더 차트"
      >
        {/* Concentric coordinate pentagons */}
        {rings.map((ratio) => {
          const pts = CORE_STATS.map((_, idx) => {
            const p = getPoint(idx, ratio);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon
              key={ratio}
              points={pts}
              fill={ratio === 1 ? '#F8FAFC' : 'none'}
              stroke="#E2E8F0"
              strokeWidth={ratio === 1 ? 1.25 : 1}
              strokeDasharray={ratio < 1 ? '3 3' : undefined}
            />
          );
        })}

        {/* Axis lines */}
        {CORE_STATS.map((stat, idx) => {
          const outer = getPoint(idx, 1);
          return (
            <line
              key={stat.key}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          );
        })}

        {/* Filled stat polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(37, 99, 235, 0.14)"
          stroke="#2563EB"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertex dots */}
        {dataPoints.map((d) => {
          const isHovered = hoveredKey === d.key;
          return (
            <g
              key={d.key}
              onMouseEnter={() => setHoveredKey(d.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="cursor-pointer"
            >
              <circle
                cx={d.point.x}
                cy={d.point.y}
                r={isHovered ? 6 : 4.5}
                fill={d.color}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              {/* Larger invisible hit area */}
              <circle cx={d.point.x} cy={d.point.y} r={14} fill="transparent" />
            </g>
          );
        })}

        {/* Axis labels + numeric values */}
        {dataPoints.map((d) => {
          const isHovered = hoveredKey === d.key;
          return (
            <g
              key={`label-${d.key}`}
              onMouseEnter={() => setHoveredKey(d.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="cursor-pointer"
            >
              <text
                x={d.labelPoint.x}
                y={d.labelPoint.y - 6}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-[12px] font-semibold transition-colors ${
                  isHovered ? 'fill-blue-600' : 'fill-slate-700'
                }`}
              >
                {d.label}
              </text>
              <text
                x={d.labelPoint.x}
                y={d.labelPoint.y + 10}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[11px] font-bold fill-slate-500 font-mono-num"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 text-xs text-slate-500 text-center min-h-[20px]">
        {hoveredKey ? (
          <span>
            <strong className="text-slate-800">
              {dataPoints.find((d) => d.key === hoveredKey)?.label}
            </strong>{' '}
            · {dataPoints.find((d) => d.key === hoveredKey)?.description}
          </span>
        ) : (
          <span>차트 기준 최대치 {scaleCeiling} pt · 꼭짓점에 마우스를 올려 상세 설명 확인</span>
        )}
      </div>
    </div>
  );
};
