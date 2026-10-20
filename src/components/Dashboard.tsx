"use client";

import { useMemo, useState } from "react";
import { CumulativeChart, WeeklyChart } from "@/components/Charts";
import { MonthlyScorecard } from "@/components/MonthlyScorecard";
import { PlatformLinks } from "@/components/PlatformLinks";
import { ReachCompare } from "@/components/ReachCompare";
import {
  PLATFORM,
  cumulativeSeries,
  formatDate,
  formatHours,
  formatNumber,
  formatRate,
  formatShare,
  formatShort,
  leadingPost,
  pairsOf,
  rangeOf,
  reachBands,
  shortTitle,
  summarize,
  topPosts,
  weeklySeries,
} from "@/lib/metrics";
import type { Platform, Report, Summary } from "@/lib/types";

type Filter = "all" | Platform;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Both platforms" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
];

function Legend({ keys }: { keys: Platform[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-[#c9c2b3]">
      {keys.map((key) => (
        <span key={key} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM[key].color }} />
          {PLATFORM[key].label}
        </span>
      ))}
    </div>
  );
}

function Badge({ platform }: { platform: Platform }) {
  const meta = PLATFORM[platform];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: meta.color, background: `${meta.color}22` }}
    >
      {meta.label}
    </span>
  );
}

function ScoreSide({
  platform,
  stats,
  active,
  onSelect,
}: {
  platform: Platform;
  stats: Summary;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = PLATFORM[platform];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`rounded-3xl border p-5 text-left transition sm:p-6 ${
        active ? "border-white/30 bg-white/[0.04]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase" style={{ color: meta.color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </span>
      <p className="font-display mt-3 text-4xl tabular-nums text-[#f3eee4] sm:text-5xl">{formatNumber(stats.reach)}</p>
      <p className="mt-1 text-sm text-[#c9c2b3]">accounts reached</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[#8f897c]">Views</dt>
          <dd className="tabular-nums text-[#f3eee4]">{formatNumber(stats.views)}</dd>
        </div>
        <div>
          <dt className="text-[#8f897c]">Posts</dt>
          <dd className="tabular-nums text-[#f3eee4]">{formatNumber(stats.posts)}</dd>
        </div>
        <div>
          <dt className="text-[#8f897c]">Avg reach</dt>
          <dd className="tabular-nums text-[#f3eee4]">{formatNumber(stats.avgReach)}</dd>
        </div>
      </dl>
    </button>
  );
}

function MetricCell({
  text,
  value,
  max,
  color,
}: {
  text: string;
  value: number | null;
  max: number;
  color: string;
}) {
  const width = value == null || max <= 0 ? 0 : Math.max(value > 0 ? 6 : 0, (value / max) * 100);
  return (
    <td className="px-4 py-3 align-middle">
      <div className="font-medium tabular-nums text-[#f3eee4]">{text}</div>
      {value != null ? (
        <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
        </div>
      ) : null}
    </td>
  );
}

export function Dashboard({ report }: { report: Report }) {
  const [filter, setFilter] = useState<Filter>("all");
  const domain = useMemo(() => rangeOf(report.posts), [report.posts]);
  const instagramPosts = useMemo(
    () => report.posts.filter((post) => post.platform === "instagram"),
    [report.posts]
  );
  const facebookPosts = useMemo(
    () => report.posts.filter((post) => post.platform === "facebook"),
    [report.posts]
  );
  const igStats = useMemo(() => summarize(instagramPosts), [instagramPosts]);
  const fbStats = useMemo(() => summarize(facebookPosts), [facebookPosts]);
  const allStats = useMemo(() => summarize(report.posts), [report.posts]);

  const visible = useMemo(
    () => (filter === "all" ? report.posts : report.posts.filter((post) => post.platform === filter)),
    [filter, report.posts]
  );
  const weeks = useMemo(() => weeklySeries(visible, domain), [visible, domain]);
  const cumulative = useMemo(() => cumulativeSeries(visible, domain), [visible, domain]);
  const bands = useMemo(() => reachBands(visible), [visible]);
  const ranked = useMemo(() => topPosts(visible, 8), [visible]);
  const pairs = useMemo(() => pairsOf(report.posts).slice(0, 8), [report.posts]);
  const spike = useMemo(() => leadingPost(visible), [visible]);
  const series: Platform[] = filter === "all" ? ["instagram", "facebook"] : [filter];
  const maxBand = Math.max(...bands.map((band) => band.posts), 1);
  const reachedThousand = visible.filter((post) => post.reach >= 1000).length;
  const combinedReach = igStats.reach + fbStats.reach;

  const pairMax = Math.max(
    1,
    ...pairs.flatMap((pair) => [pair.instagram?.reach ?? 0, pair.facebook?.reach ?? 0])
  );

  const rows: {
    label: string;
    ig: string;
    fb: string;
    igValue: number | null;
    fbValue: number | null;
  }[] = [
    { label: "Posts", ig: formatNumber(igStats.posts), fb: formatNumber(fbStats.posts), igValue: igStats.posts, fbValue: fbStats.posts },
    { label: "Reach", ig: formatNumber(igStats.reach), fb: formatNumber(fbStats.reach), igValue: igStats.reach, fbValue: fbStats.reach },
    { label: "Views", ig: formatNumber(igStats.views), fb: formatNumber(fbStats.views), igValue: igStats.views, fbValue: fbStats.views },
    {
      label: "Engagements",
      ig: formatNumber(igStats.engagements),
      fb: formatNumber(fbStats.engagements),
      igValue: igStats.engagements,
      fbValue: fbStats.engagements,
    },
    {
      label: "Avg reach",
      ig: formatNumber(igStats.avgReach),
      fb: formatNumber(fbStats.avgReach),
      igValue: igStats.avgReach,
      fbValue: fbStats.avgReach,
    },
    {
      label: "Eng. rate",
      ig: formatRate(igStats.engagementRate),
      fb: formatRate(fbStats.engagementRate),
      igValue: igStats.engagementRate,
      fbValue: fbStats.engagementRate,
    },
    {
      label: "Likes / reactions",
      ig: formatNumber(igStats.likes),
      fb: formatNumber(fbStats.reactions),
      igValue: igStats.likes,
      fbValue: fbStats.reactions,
    },
    {
      label: "Comments",
      ig: formatNumber(igStats.comments),
      fb: formatNumber(fbStats.comments),
      igValue: igStats.comments,
      fbValue: fbStats.comments,
    },
    {
      label: "Shares",
      ig: formatNumber(igStats.shares),
      fb: formatNumber(fbStats.shares),
      igValue: igStats.shares,
      fbValue: fbStats.shares,
    },
    { label: "Saves", ig: formatNumber(igStats.saves), fb: "n/a", igValue: igStats.saves, fbValue: null },
    { label: "Follows", ig: formatNumber(igStats.follows), fb: "n/a", igValue: igStats.follows, fbValue: null },
    {
      label: "Watch time",
      ig: "n/a",
      fb: formatHours(fbStats.watchSeconds),
      igValue: null,
      fbValue: fbStats.watchSeconds,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] overflow-x-clip px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.22em] text-[#e6b325] uppercase">Freelance content scorecard</p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-[#f3eee4] sm:text-6xl">How far her content reached</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed break-words text-[#c9c2b3]">
          {report.account} on Instagram @{report.instagramUsername} and Facebook {report.facebookPage},{" "}
          {formatDate(domain.start)} to {formatDate(domain.end)}.
        </p>
      </header>

      <section className="mt-8" aria-label="Platform reach score">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <ScoreSide
            platform="instagram"
            stats={igStats}
            active={filter === "instagram"}
            onSelect={() => setFilter((current) => (current === "instagram" ? "all" : "instagram"))}
          />
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#e6b325]/30 bg-[#e6b325]/10 px-6 py-5 text-center">
            <p className="text-xs font-medium tracking-[0.18em] text-[#e6b325] uppercase">Combined</p>
            <p className="font-display mt-2 text-4xl tabular-nums text-[#f3eee4]">{formatNumber(combinedReach)}</p>
            <p className="mt-1 text-sm text-[#c9c2b3]">reach, both platforms</p>
          </div>
          <ScoreSide
            platform="facebook"
            stats={fbStats}
            active={filter === "facebook"}
            onSelect={() => setFilter((current) => (current === "facebook" ? "all" : "facebook"))}
          />
        </div>
        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            <div style={{ width: `${(igStats.reach / combinedReach) * 100}%`, background: PLATFORM.instagram.color }} />
            <div style={{ width: `${(fbStats.reach / combinedReach) * 100}%`, background: PLATFORM.facebook.color }} />
          </div>
          <p className="mt-2 text-sm text-[#c9c2b3]">
            Facebook delivered {formatShare(fbStats.reach / combinedReach)} of reach. Instagram delivered{" "}
            {formatShare(igStats.reach / combinedReach)}. Combined reach counts each platform separately.
          </p>
        </div>
      </section>

      <MonthlyScorecard posts={visible} />
      <ReachCompare posts={visible} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-[#f3eee4]">Reach over time</h2>
          <p className="text-sm text-[#c9c2b3]">
            {visible.length} posts in this view · {formatNumber(summarize(visible).reach)} reach
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Platform filter">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === item.id
                  ? "bg-[#e6b325] text-[#1a1608]"
                  : "border border-white/10 text-[#f3eee4] hover:border-white/25"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-4 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-[#f3eee4]">Weekly reach</h3>
            <p className="text-sm text-[#c9c2b3]">Lifetime reach of posts published that week.</p>
          </div>
          <Legend keys={series} />
        </div>
        <WeeklyChart weeks={weeks} series={series} />
        {spike ? (
          <p className="mt-3 text-sm text-[#c9c2b3]">
            {shortTitle(spike.post.title, 80)} accounts for {formatShare(spike.share)} of reach in this view (
            {formatNumber(spike.post.reach)} on {formatDate(spike.post.date)}).
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="min-w-0 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-[#f3eee4]">Cumulative reach</h3>
              <p className="text-sm text-[#c9c2b3]">Running total from {formatShort(domain.start)}.</p>
            </div>
            <Legend keys={series} />
          </div>
          <CumulativeChart weeks={cumulative} series={series} />
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-[#f3eee4]">Posts by reach</h3>
          <p className="mt-1 text-sm text-[#c9c2b3]">
            {formatNumber(reachedThousand)} posts reached 1,000 or more accounts.
          </p>
          <ul className="mt-5 space-y-4">
            {bands.map((band) => (
              <li key={band.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-[#f3eee4]">{band.label}</span>
                  <span className="tabular-nums text-[#c9c2b3]">
                    {band.posts} posts · {formatNumber(band.reach)} reach
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#e6b325]"
                    style={{ width: `${(band.posts / maxBand) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="min-w-0 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6 lg:col-span-3">
          <h3 className="text-lg font-medium text-[#f3eee4]">Full scorecard</h3>
          <p className="mt-1 text-sm text-[#c9c2b3]">
            Instagram views are post views. Facebook views are 3-second video views. Engagements are likes, comments,
            shares and saves on Instagram, and reactions, comments and shares on Facebook.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="text-xs tracking-[0.14em] text-[#8f897c] uppercase">
                  <th className="px-4 py-2 font-medium">Metric</th>
                  <th className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM.instagram.color }} />
                      Instagram
                    </span>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM.facebook.color }} />
                      Facebook
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const values = [row.igValue, row.fbValue].filter((value): value is number => value != null);
                  const max = Math.max(...values, 0);
                  return (
                    <tr key={row.label} className="border-t border-white/10">
                      <th className="px-4 py-3 font-normal text-[#c9c2b3]">{row.label}</th>
                      <MetricCell text={row.ig} value={row.igValue} max={max} color={PLATFORM.instagram.color} />
                      <MetricCell text={row.fb} value={row.fbValue} max={max} color={PLATFORM.facebook.color} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {fbStats.avgWatchSec != null ? (
            <p className="mt-3 text-sm text-[#c9c2b3]">
              Facebook watch time is {formatHours(fbStats.watchSeconds)}, about {fbStats.avgWatchSec.toFixed(0)} seconds
              per 3-second view.
            </p>
          ) : null}
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-[#f3eee4]">Highest reach</h3>
          <p className="mt-1 text-sm text-[#c9c2b3]">Top posts in the selected view.</p>
          <ol className="mt-4 space-y-4">
            {ranked.map((post, index) => {
              const topReach = ranked[0]?.reach || 1;
              return (
                <li key={post.id} className="grid grid-cols-[1.5rem_1fr] gap-3">
                  <span className="pt-0.5 text-sm tabular-nums text-[#8f897c]">{index + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge platform={post.platform} />
                      <span className="text-xs text-[#8f897c]">
                        {formatDate(post.date)} · {post.durationSec}s
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#f3eee4]">{post.title}</p>
                    <PlatformLinks post={post} posts={report.posts} />
                    <div className="mt-2 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(post.reach / topReach) * 100}%`,
                          background: PLATFORM[post.platform].color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-[#c9c2b3]">
                      {formatNumber(post.reach)} reach · {formatNumber(post.views)} views
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {pairs.length > 0 ? (
        <section className="mt-4 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#f3eee4]">Same video, both platforms</h3>
              <p className="text-sm text-[#c9c2b3]">
                Cross-posts published within 30 minutes with a matching length. Ranked by combined reach.
              </p>
            </div>
            <Legend keys={["instagram", "facebook"]} />
          </div>
          <ul className="space-y-5">
            {pairs.map((pair) => (
              <li key={pair.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-[#f3eee4]">{pair.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pair.instagram?.permalink ? (
                        <a
                          href={pair.instagram.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{ color: PLATFORM.instagram.color, borderColor: `${PLATFORM.instagram.color}88` }}
                        >
                          Instagram
                        </a>
                      ) : null}
                      {pair.facebook?.permalink ? (
                        <a
                          href={pair.facebook.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{ color: PLATFORM.facebook.color, borderColor: `${PLATFORM.facebook.color}88` }}
                        >
                          Facebook
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs text-[#c9c2b3]">{formatDate(pair.date)}</span>
                </div>
                {(["instagram", "facebook"] as const).map((platform) => {
                  const value = pair[platform]?.reach ?? 0;
                  return (
                    <div key={platform} className="mt-2 grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                      <span style={{ color: PLATFORM[platform].color }}>{PLATFORM[platform].label}</span>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(value / pairMax) * 100}%`,
                            background: PLATFORM[platform].color,
                          }}
                        />
                      </div>
                      <span className="text-right tabular-nums text-[#f3eee4]">{formatNumber(value)}</span>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 flex flex-col gap-2 text-sm text-[#8f897c] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Source: {report.sources.instagram} ({formatNumber(igStats.posts)} posts) and {report.sources.facebook} (
          {formatNumber(fbStats.posts)} videos). Lifetime totals, {formatNumber(allStats.posts)} pieces of content.
        </p>
        <p className="tabular-nums">{formatNumber(allStats.engagements)} engagements</p>
      </footer>
    </div>
  );
}
