import { Dashboard } from "@/components/Dashboard";
import type { Report } from "@/lib/types";
import report from "@/data/posts.json";

export default function Home() {
  return <Dashboard report={report as Report} />;
}
