"use client";

import { useState } from "react";
import { PLATFORM, formatCompact, formatNumber } from "@/lib/metrics";
import type { Platform, WeekPoint } from "@/lib/types";

const WIDTH = 760;
const HEIGHT = 300;
const PAD = { top: 16, right: 12, bottom: 36, left: 52 };

function showLabel(index: number, count: number) {
  if (count <= 10) return true;
  return index === 0 || index === count - 1 || index % 2 === 0;
}

function YAxis({ max }: { max: number }) {
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  return (
    <g>
      {Array.from({ length: 5 }, (_, index) => {
        const value = (max / 4) * (4 - index);
        const y = PAD.top + (innerH / 4) * index;
        return (
          <g key={index}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="rgba(243,238,228,0.08)"
            />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#c9c2b3" fontSize="12">
              {formatCompact(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function WeeklyChart({ weeks, series }: { weeks: WeekPoint[]; series: Platform[] }) {
  const [active, setActive] = useState<number | null>(null);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = Math.max(1, ...weeks.flatMap((week) => series.map((key) => week[key])));
  const slot = weeks.length ? innerW / weeks.length : innerW;
  const gap = 3;
  const barWidth = Math.max(4, Math.min(18, (slot * 0.62 - gap) / series.length));
  const peakIndex = weeks.reduce(
    (best, week, index) => {
      const total = series.reduce((sum, key) => sum + week[key], 0);
      return total > best.total ? { index, total } : best;
    },
    { index: 0, total: -1 }
  ).index;
  const shown = weeks[active ?? peakIndex];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[320px] w-full"
        role="img"
        aria-label={
          shown
            ? `Weekly reach. Highest week is ${shown.label}, ${formatNumber(series.reduce((sum, key) => sum + shown[key], 0))} reach.`
            : "Weekly reach"
        }
      >
        <YAxis max={max} />
        {weeks.map((week, index) => {
          const center = PAD.left + slot * index + slot / 2;
          const groupWidth = barWidth * series.length + gap * (series.length - 1);
          const start = center - groupWidth / 2;
          return (
            <g key={week.week} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill={active === index ? "rgba(243,238,228,0.05)" : "transparent"}
              />
              {series.map((key, seriesIndex) => {
                const value = week[key];
                const barHeight = (value / max) * innerH;
                const x = start + seriesIndex * (barWidth + gap);
                const y = PAD.top + innerH - barHeight;
                return (
                  <rect
                    key={key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={value > 0 ? Math.max(barHeight, 2) : 0}
                    rx="2"
                    fill={PLATFORM[key].color}
                  />
                );
              })}
              {showLabel(index, weeks.length) ? (
                <text x={center} y={HEIGHT - 10} textAnchor="middle" fill="#c9c2b3" fontSize="12">
                  {week.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {shown ? (
        <p className="mt-3 text-sm text-[#c9c2b3]">
          Week of {shown.label}
          {series.map((key) => (
            <span key={key}>
              {" "}
              · <span style={{ color: PLATFORM[key].color }}>{PLATFORM[key].label}</span>{" "}
              <span className="tabular-nums text-[#f3eee4]">{formatNumber(shown[key])}</span>
            </span>
          ))}
          {active == null ? " · highest week" : ""}
        </p>
      ) : null}
    </div>
  );
}

export function CumulativeChart({ weeks, series }: { weeks: WeekPoint[]; series: Platform[] }) {
  const [active, setActive] = useState<number | null>(null);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = Math.max(1, ...weeks.flatMap((week) => series.map((key) => week[key])));
  const slot = weeks.length ? innerW / weeks.length : innerW;
  const points = (key: Platform) =>
    weeks.map((week, index) => {
      const x = PAD.left + slot * index + slot / 2;
      const y = PAD.top + innerH - (week[key] / max) * innerH;
      return { x, y };
    });
  const baseline = PAD.top + innerH;
  const lineOf = (key: Platform) =>
    points(key)
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");
  const areaOf = (key: Platform) => {
    const line = points(key);
    if (!line.length) return "";
    const last = line[line.length - 1];
    const first = line[0];
    return `${lineOf(key)} L${last.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z`;
  };
  const shown = weeks[active ?? weeks.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[280px] w-full" role="img" aria-label="Cumulative reach">
        <defs>
          <linearGradient id="igFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PLATFORM.instagram.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={PLATFORM.instagram.color} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="fbFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PLATFORM.facebook.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={PLATFORM.facebook.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <YAxis max={max} />
        {series.map((key) => (
          <path key={`${key}-fill`} d={areaOf(key)} fill={key === "instagram" ? "url(#igFill)" : "url(#fbFill)"} />
        ))}
        {series.map((key) => (
          <path key={`${key}-line`} d={lineOf(key)} fill="none" stroke={PLATFORM[key].color} strokeWidth="2.5" />
        ))}
        {weeks.map((week, index) => (
          <rect
            key={week.week}
            x={PAD.left + slot * index}
            y={PAD.top}
            width={slot}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
        {weeks.map((week, index) =>
          showLabel(index, weeks.length) ? (
            <text
              key={`${week.week}-label`}
              x={PAD.left + slot * index + slot / 2}
              y={HEIGHT - 10}
              textAnchor="middle"
              fill="#c9c2b3"
              fontSize="12"
            >
              {week.label}
            </text>
          ) : null
        )}
        {shown
          ? series.map((key) => {
              const point = points(key)[active ?? weeks.length - 1];
              return <circle key={`${key}-dot`} cx={point.x} cy={point.y} r="4" fill={PLATFORM[key].color} />;
            })
          : null}
      </svg>
      {shown ? (
        <p className="mt-3 text-sm text-[#c9c2b3]">
          Through {shown.label}
          {series.map((key) => (
            <span key={key}>
              {" "}
              · <span style={{ color: PLATFORM[key].color }}>{PLATFORM[key].label}</span>{" "}
              <span className="tabular-nums text-[#f3eee4]">{formatNumber(shown[key])}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
