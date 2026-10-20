import { PLATFORM } from "@/lib/metrics";
import type { Platform, Post } from "@/lib/types";

function hrefFor(post: Post, posts: Post[], platform: Platform) {
  if (post.platform === platform) return post.permalink;
  if (!post.pairId) return null;
  return posts.find((item) => item.pairId === post.pairId && item.platform === platform)?.permalink ?? null;
}

export function PlatformLinks({ post, posts }: { post: Post; posts: Post[] }) {
  const links = (["instagram", "facebook"] as const)
    .map((platform) => ({ platform, href: hrefFor(post, posts, platform) }))
    .filter((link): link is { platform: Platform; href: string } => Boolean(link.href));

  if (!links.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{
            color: PLATFORM[link.platform].color,
            borderColor: `${PLATFORM[link.platform].color}88`,
          }}
        >
          {PLATFORM[link.platform].label}
        </a>
      ))}
    </div>
  );
}
