export type Platform = "instagram" | "facebook";

export type Post = {
  id: string;
  platform: Platform;
  title: string;
  date: string;
  time: string;
  durationSec: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
  reactions: number;
  watchSeconds: number;
  permalink: string | null;
  type: string;
  pairId: string | null;
};

export type Report = {
  account: string;
  instagramUsername: string;
  facebookPage: string;
  sources: { instagram: string; facebook: string };
  posts: Post[];
};

export type Summary = {
  posts: number;
  reach: number;
  views: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
  reactions: number;
  watchSeconds: number;
  avgReach: number;
  engagementRate: number;
  avgWatchSec: number | null;
};

export type WeekPoint = {
  week: string;
  label: string;
  instagram: number;
  facebook: number;
  posts: number;
};

export type Band = {
  label: string;
  posts: number;
  reach: number;
};

export type MonthScore = {
  key: string;
  label: string;
  partial: boolean;
  through: string;
  posts: number;
  reach: number;
  avgReach: number;
  engagementRate: number;
  follows: number;
  instagramReach: number;
  facebookReach: number;
  topShare: number;
  topTitle: string;
  reachChange: number | null;
};

export type Pair = {
  id: string;
  title: string;
  date: string;
  permalink: string | null;
  instagram: Post | null;
  facebook: Post | null;
  combinedReach: number;
};
