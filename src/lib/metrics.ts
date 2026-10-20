import type { Band, MonthScore, Pair, Post, Summary, WeekPoint } from "./types";

export const REACH_LINE = 1000;
const ARABIC = /[\u0600-\u06FF]/;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PLATFORM = {
  instagram: { label: "Instagram", color: "#ff6b4a" },
  facebook: { label: "Facebook", color: "#7eb7e6" },
} as const;

export function engagement(post: Post) {
  if (post.platform === "instagram") {
    return post.likes + post.comments + post.shares + post.saves;
  }
  return post.reactions + post.comments + post.shares;
}

export function summarize(posts: Post[]): Summary {
  const totals = posts.reduce(
    (sum, post) => {
      sum.posts += 1;
      sum.reach += post.reach;
      sum.views += post.views;
      sum.engagements += engagement(post);
      sum.likes += post.likes;
      sum.comments += post.comments;
      sum.shares += post.shares;
      sum.saves += post.saves;
      sum.follows += post.follows;
      sum.reactions += post.reactions;
      sum.watchSeconds += post.watchSeconds;
      return sum;
    },
    {
      posts: 0,
      reach: 0,
      views: 0,
      engagements: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      follows: 0,
      reactions: 0,
      watchSeconds: 0,
    }
  );

  return {
    ...totals,
    avgReach: totals.posts ? totals.reach / totals.posts : 0,
    engagementRate: totals.reach ? totals.engagements / totals.reach : 0,
    avgWatchSec: totals.views > 0 && totals.watchSeconds > 0 ? totals.watchSeconds / totals.views : null,
  };
}

export function rangeOf(posts: Post[]) {
  const dates = posts.map((post) => post.date).sort();
  return { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" };
}

function parseDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function weeklySeries(posts: Post[], domain: { start: string; end: string }): WeekPoint[] {
  if (!domain.start || !domain.end) return [];
  const buckets = new Map<string, WeekPoint>();
  const cursor = startOfWeek(parseDate(domain.start));
  const last = startOfWeek(parseDate(domain.end));

  while (cursor <= last) {
    const week = toIso(cursor);
    buckets.set(week, {
      week,
      label: formatShort(week),
      instagram: 0,
      facebook: 0,
      posts: 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  for (const post of posts) {
    const week = toIso(startOfWeek(parseDate(post.date)));
    const bucket = buckets.get(week);
    if (!bucket) continue;
    bucket[post.platform] += post.reach;
    bucket.posts += 1;
  }

  return [...buckets.values()];
}

export function cumulativeSeries(posts: Post[], domain: { start: string; end: string }): WeekPoint[] {
  let instagram = 0;
  let facebook = 0;
  let count = 0;
  return weeklySeries(posts, domain).map((week) => {
    instagram += week.instagram;
    facebook += week.facebook;
    count += week.posts;
    return { ...week, instagram, facebook, posts: count };
  });
}

const REACH_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under 200", min: 0, max: 200 },
  { label: "200 – 499", min: 200, max: 500 },
  { label: "500 – 999", min: 500, max: 1000 },
  { label: "1,000 – 4,999", min: 1000, max: 5000 },
  { label: "5,000+", min: 5000, max: Infinity },
];

export function reachBands(posts: Post[]): Band[] {
  return REACH_BANDS.map((band) => {
    const matching = posts.filter((post) => post.reach >= band.min && post.reach < band.max);
    return {
      label: band.label,
      posts: matching.length,
      reach: matching.reduce((sum, post) => sum + post.reach, 0),
    };
  });
}

export function pairsOf(posts: Post[]): Pair[] {
  const pairs = new Map<string, Pair>();
  for (const post of posts) {
    if (!post.pairId) continue;
    const pair = pairs.get(post.pairId) ?? {
      id: post.pairId,
      title: post.title,
      date: post.date,
      permalink: post.permalink,
      instagram: null,
      facebook: null,
      combinedReach: 0,
    };
    pair[post.platform] = post;
    pair.combinedReach += post.reach;
    if (post.permalink) pair.permalink = post.permalink;
    if (post.platform === "instagram") pair.title = post.title;
    if (post.date < pair.date) pair.date = post.date;
    pairs.set(post.pairId, pair);
  }
  return [...pairs.values()].sort((a, b) => b.combinedReach - a.combinedReach);
}

export function topPosts(posts: Post[], count = 8) {
  return [...posts].sort((a, b) => b.reach - a.reach || b.views - a.views).slice(0, count);
}

export function leadingPost(posts: Post[]) {
  const [post] = topPosts(posts, 1);
  if (!post) return null;
  const reach = posts.reduce((sum, item) => sum + item.reach, 0);
  if (!reach) return null;
  const share = post.reach / reach;
  if (share < 0.12) return null;
  return { post, share };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRate(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatShare(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

export function formatHours(seconds: number) {
  const hours = seconds / 3600;
  if (hours >= 10) return `${formatNumber(Math.round(hours))} h`;
  return `${hours.toFixed(1)} h`;
}

export function formatDate(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatShort(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function shortTitle(title: string, max = 36) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1).trimEnd()}…`;
}

export function isArabic(title: string) {
  return ARABIC.test(title);
}

function hourOf(time: string) {
  return Number(time.slice(0, 2)) || 0;
}

export function isNight(time: string) {
  return hourOf(time) < 6;
}

export function isMorning(time: string) {
  const hour = hourOf(time);
  return hour >= 6 && hour < 12;
}

function monthLastDay(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function monthlyScores(posts: Post[]): MonthScore[] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const key = post.date.slice(0, 7);
    const group = groups.get(key) ?? [];
    group.push(post);
    groups.set(key, group);
  }
  const keys = [...groups.keys()].sort();
  const end = posts.map((post) => post.date).sort().at(-1) ?? "";
  let previousReach: number | null = null;

  return keys.map((key) => {
    const group = groups.get(key) ?? [];
    const stats = summarize(group);
    const top = topPosts(group, 1)[0];
    const [year, month] = key.split("-").map(Number);
    const through = group.map((post) => post.date).sort().at(-1) ?? "";
    const partial = key === end.slice(0, 7) && Number(end.slice(8, 10)) < monthLastDay(key);
    const score: MonthScore = {
      key,
      label: `${MONTHS[month - 1]} ${year}`,
      partial,
      through,
      posts: stats.posts,
      reach: stats.reach,
      avgReach: stats.avgReach,
      engagementRate: stats.engagementRate,
      follows: stats.follows,
      instagramReach: group.filter((post) => post.platform === "instagram").reduce((sum, post) => sum + post.reach, 0),
      facebookReach: group.filter((post) => post.platform === "facebook").reduce((sum, post) => sum + post.reach, 0),
      topShare: stats.reach && top ? top.reach / stats.reach : 0,
      topTitle: top ? shortTitle(top.title, 72) : "",
      reachChange: previousReach ? (stats.reach - previousReach) / previousReach : null,
    };
    previousReach = stats.reach;
    return score;
  });
}

export function monthlyDecisions(months: MonthScore[]) {
  const lines: string[] = [];
  const full = months.filter((month) => !month.partial);
  const bestEngagement = full.reduce<MonthScore | null>(
    (best, month) => (!best || month.engagementRate > best.engagementRate ? month : best),
    null
  );

  if (bestEngagement && bestEngagement.topShare < 0.25) {
    lines.push(
      `${bestEngagement.label} is the month to repeat: engagement rate ${formatRate(bestEngagement.engagementRate)}, and the biggest post was ${formatShare(bestEngagement.topShare)} of that month's reach.`
    );
  }

  for (let index = 1; index < months.length; index += 1) {
    const current = months[index];
    const previous = months[index - 1];
    if (current.partial) continue;
    if (current.posts > previous.posts * 1.3 && current.avgReach < previous.avgReach * 0.7) {
      lines.push(
        `${current.label} published ${formatNumber(current.posts)} posts, up from ${formatNumber(previous.posts)} in ${previous.label}, and average reach fell from ${formatNumber(previous.avgReach)} to ${formatNumber(current.avgReach)}.`
      );
    }
  }

  const open = months.find((month) => month.partial);
  if (open && open.topShare >= 0.4) {
    lines.push(
      `${open.label} only runs through ${formatDate(open.through)}, and ${formatShare(open.topShare)} of its reach is one post (${open.topTitle}). Hold the next month's target until another post gets close to that result.`
    );
  }

  const latest = full.at(-1);
  if (latest && latest.reach > 0 && latest.facebookReach > latest.instagramReach * 1.5) {
    lines.push(
      `In ${latest.label}, Facebook delivered ${formatShare(latest.facebookReach / latest.reach)} of reach. Lead the next month with Facebook for reach, and keep the Instagram posts that clear ${formatNumber(REACH_LINE)}.`
    );
  }

  return lines;
}

export function reachFindings(posts: Post[]) {
  if (!posts.length) return [];
  const reaching = posts.filter((post) => post.reach >= REACH_LINE);
  const totalReach = posts.reduce((sum, post) => sum + post.reach, 0);
  const reachingReach = reaching.reduce((sum, post) => sum + post.reach, 0);
  const lines = [
    `${formatNumber(reaching.length)} posts, ${formatShare(reaching.length / posts.length)} of output, delivered ${formatShare(totalReach ? reachingReach / totalReach : 0)} of reach.`,
  ];

  const images = posts.filter((post) => post.type === "IG image");
  if (images.length && images.every((post) => post.reach < REACH_LINE)) {
    const highest = Math.max(...images.map((post) => post.reach));
    lines.push(
      `All ${formatNumber(images.length)} still images stayed at or below ${formatNumber(highest)} reach. Every post that cleared ${formatNumber(REACH_LINE)} was a video.`
    );
  }

  const arabic = posts.filter((post) => isArabic(post.title));
  const latin = posts.filter((post) => post.title !== "Facebook video" && !isArabic(post.title));
  if (arabic.length >= 10 && latin.length >= 10) {
    const arabicHit = arabic.filter((post) => post.reach >= REACH_LINE).length / arabic.length;
    const latinHit = latin.filter((post) => post.reach >= REACH_LINE).length / latin.length;
    if (arabicHit > latinHit * 1.5) {
      lines.push(
        `Arabic posts cleared ${formatNumber(REACH_LINE)} on ${formatShare(arabicHit)} of posts. English posts did so on ${formatShare(latinHit)}.`
      );
    }
  }

  const night = posts.filter((post) => isNight(post.time));
  const morning = posts.filter((post) => isMorning(post.time));
  if (night.length >= 10 && morning.length >= 10) {
    const nightHit = night.filter((post) => post.reach >= REACH_LINE).length / night.length;
    const morningHit = morning.filter((post) => post.reach >= REACH_LINE).length / morning.length;
    if (morningHit > nightHit * 1.5) {
      lines.push(
        `Morning posts cleared ${formatNumber(REACH_LINE)} on ${formatShare(morningHit)} of posts. Posts from midnight to 6am did so on ${formatShare(nightHit)}.`
      );
    }
  }

  return lines;
}
