import {
  PLATFORM,
  formatDate,
  formatNumber,
  formatRate,
  formatShare,
  monthlyDecisions,
  monthlyScores,
} from "@/lib/metrics";
import type { Post } from "@/lib/types";

export function MonthlyScorecard({ posts }: { posts: Post[] }) {
  const months = monthlyScores(posts);
  const decisions = monthlyDecisions(months);
  if (!months.length) return null;

  return (
    <section className="mt-8" aria-label="Monthly decision scorecard">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-[#e6b325] uppercase">For the monthly review</p>
        <h2 className="font-display mt-2 text-3xl text-[#f3eee4]">Decision scorecard</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#c9c2b3]">
          Compare months on reach, reach per post, and engagement rate before setting the next month&apos;s target. The
          latest month is marked partial when the export ends before that month closes.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {months.map((month) => {
          const leader = month.facebookReach >= month.instagramReach ? "facebook" : "instagram";
          return (
            <article key={month.key} className="rounded-3xl border border-white/10 bg-[#1b211c] p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-[#f3eee4]">{month.label}</h3>
                {month.partial ? (
                  <span className="rounded-full bg-[#e6b325]/15 px-2 py-0.5 text-xs text-[#e6b325]">
                    through {formatDate(month.through)}
                  </span>
                ) : null}
              </div>
              <p className="font-display mt-3 text-3xl tabular-nums text-[#f3eee4]">{formatNumber(month.reach)}</p>
              <p className="text-sm text-[#c9c2b3]">
                reach
                {month.reachChange != null && !month.partial
                  ? ` · ${month.reachChange >= 0 ? "+" : ""}${formatShare(month.reachChange)} vs prior month`
                  : ""}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c2b3]">Posts</dt>
                  <dd className="tabular-nums">{formatNumber(month.posts)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c2b3]">Reach / post</dt>
                  <dd className="tabular-nums">{formatNumber(month.avgReach)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c2b3]">Eng. rate</dt>
                  <dd className="tabular-nums">{formatRate(month.engagementRate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c2b3]">Follows</dt>
                  <dd className="tabular-nums">{formatNumber(month.follows)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#c9c2b3]">Led by</dt>
                  <dd style={{ color: PLATFORM[leader].color }}>{PLATFORM[leader].label}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
      {decisions.length ? (
        <ul className="mt-4 space-y-2 rounded-3xl border border-[#e6b325]/30 bg-[#e6b325]/10 p-4 sm:p-5">
          {decisions.map((line) => (
            <li key={line} className="text-sm leading-relaxed text-[#f3eee4]">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
