"use client";

interface FeedItem {
  id: string;
  text: string;
  status?: "pending" | "running" | "done";
}

interface PanelRightAgentFeedProps {
  feed: FeedItem[];
}

export function PanelRightAgentFeed({ feed }: PanelRightAgentFeedProps) {
  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4 h-full">
      <h3 className="text-sm font-medium text-[#f1f1f1] mb-3">Agent activity</h3>
      <div className="space-y-2 text-sm text-[#d3d3d3]">
        {feed.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-[#9f9f9f]">•</span>
            <span>{item.text}</span>
          </div>
        ))}
        {feed.length === 0 && <div className="text-xs text-[#9f9f9f]">Waiting for activity…</div>}
      </div>
    </div>
  );
}
