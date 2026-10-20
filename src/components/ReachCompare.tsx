import { PlatformLinks } from "@/components/PlatformLinks";
import {
  PLATFORM,
  REACH_LINE,
  formatDate,
  formatNumber,
  formatRate,
  formatShare,
  isArabic,
  isNight,
  reachFindings,
  summarize,
} from "@/lib/metrics";
import type { Post } from "@/lib/types";

function Column({
  title,
  detail,
  posts,
  allPosts,
  tone,
}: {
  title: string;
  detail: string;
  posts: Post[];
  allPosts: Post[];
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-[#1b211c] p-4 sm:p-5">
      <h3 className="text-lg font-medium" style={{ color: tone }}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#c9c2b3]">{detail}</p>
      <ol className="mt-4 space-y-4">
        {posts.map((post, index) => (
          <li key={post.id}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#c9c2b3]">
              <span className="tabular-nums">{index + 1}</span>
              <span style={{ color: PLATFORM[post.platform].color }}>{PLATFORM[post.platform].label}</span>
              <span>
                {formatDate(post.date)} · {post.durationSec}s
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#f3eee4]">{post.title}</p>
            <p className="mt-1 text-xs tabular-nums text-[#c9c2b3]">
              {formatNumber(post.reach)} reach · {formatNumber(post.views)} views
            </p>
            <PlatformLinks post={post} posts={allPosts} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ReachCompare({ posts }: { posts: Post[] }) {
  const reaching = posts.filter((post) => post.reach >= REACH_LINE).sort((a, b) => b.reach - a.reach);
  const quiet = posts
    .filter((post) => post.reach < REACH_LINE && post.title !== "Facebook video")
    .sort((a, b) => a.reach - b.reach);
  if (!posts.length) return null;

  const reachingStats = summarize(reaching);
  const quietPosts = posts.filter((post) => post.reach < REACH_LINE);
  const quietStats = summarize(quietPosts);
  const totalReach = reachingStats.reach + quietStats.reach;
  const findings = reachFindings(posts);

  const rows = [
    {
      label: "Posts",
      reaching: formatNumber(reachingStats.posts),
      quiet: formatNumber(quietStats.posts),
    },
    {
      label: "Share of reach",
      reaching: formatShare(totalReach ? reachingStats.reach / totalReach : 0),
      quiet: formatShare(totalReach ? quietStats.reach / totalReach : 0),
    },
    {
      label: "Average reach",
      reaching: formatNumber(reachingStats.avgReach),
      quiet: formatNumber(quietStats.avgReach),
    },
    {
      label: "Eng. rate",
      reaching: formatRate(reachingStats.engagementRate),
      quiet: formatRate(quietStats.engagementRate),
    },
    {
      label: "Arabic posts",
      reaching: formatShare(reaching.length ? reaching.filter((post) => isArabic(post.title)).length / reaching.length : 0),
      quiet: formatShare(quietPosts.length ? quietPosts.filter((post) => isArabic(post.title)).length / quietPosts.length : 0),
    },
    {
      label: "Midnight to 6am",
      reaching: formatShare(reaching.length ? reaching.filter((post) => isNight(post.time)).length / reaching.length : 0),
      quiet: formatShare(quietPosts.length ? quietPosts.filter((post) => isNight(post.time)).length / quietPosts.length : 0),
    },
  ];

  return (
    <section className="mt-8" aria-label="Reaching and not reaching content">
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.18em] text-[#e6b325] uppercase">Content comparison</p>
        <h2 className="font-display mt-2 text-3xl text-[#f3eee4]">What reached, and what did not</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#c9c2b3]">
          A post counts as reaching when at least {formatNumber(REACH_LINE)} accounts saw it. Everything under that line
          stayed in the quiet group.
        </p>
      </div>

      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <div
            style={{ width: `${totalReach ? (reachingStats.reach / totalReach) * 100 : 0}%`, background: "#8fbf6a" }}
          />
          <div className="flex-1 bg-[#8f897c]" />
        </div>
        <p className="mt-2 text-sm text-[#c9c2b3]">
          Reaching posts: {formatNumber(reachingStats.reach)} reach. Quiet posts: {formatNumber(quietStats.reach)} reach.
          Engagement on the reaching side is {formatRate(reachingStats.engagementRate)}, against{" "}
          {formatRate(quietStats.engagementRate)} on the quiet side.
        </p>
      </div>

      {findings.length ? (
        <ul className="mt-4 space-y-2">
          {findings.map((line) => (
            <li key={line} className="text-sm leading-relaxed text-[#f3eee4]">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-[#1b211c]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-xs tracking-[0.14em] text-[#8f897c] uppercase">
              <th className="px-4 py-3 font-medium">Comparison</th>
              <th className="px-4 py-3 font-medium text-[#8fbf6a]">Reached {formatNumber(REACH_LINE)}+</th>
              <th className="px-4 py-3 font-medium text-[#c9c2b3]">Under {formatNumber(REACH_LINE)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/10">
                <th className="px-4 py-3 font-normal text-[#c9c2b3]">{row.label}</th>
                <td className="px-4 py-3 tabular-nums text-[#f3eee4]">{row.reaching}</td>
                <td className="px-4 py-3 tabular-nums text-[#f3eee4]">{row.quiet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Column
          title="Reached"
          detail={`${formatNumber(reaching.length)} posts. Highest first.`}
          posts={reaching.slice(0, 6)}
          allPosts={posts}
          tone="#8fbf6a"
        />
        <Column
          title="Did not reach"
          detail={`${formatNumber(quietPosts.length)} posts under ${formatNumber(REACH_LINE)}. Lowest first.`}
          posts={quiet.slice(0, 6)}
          allPosts={posts}
          tone="#c9c2b3"
        />
      </div>
      <p className="mt-3 text-xs text-[#8f897c]">
        Instagram and Facebook open on separate buttons. A Facebook post goes to Facebook, and the matching Instagram
        post goes to Instagram.
      </p>
    </section>
  );
}
