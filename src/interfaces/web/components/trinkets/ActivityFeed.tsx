import type { ActivityFeedItemDTO } from "@/application/dtos/TrinketCollectionDTO";
import { CoinIcon } from "@/interfaces/web/components/icons";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function describe(item: ActivityFeedItemDTO): string {
  if (item.type === "shop_purchase") {
    return item.trinket ? `bought ${item.trinket.name}` : "bought something";
  }
  if (item.trinket) return `claimed ${item.trinket.name}`;
  return `claimed ${item.coins ?? 0} coins`;
}

/** Friends' recent battle-pass claims and shop purchases — never the viewer's own. */
export function ActivityFeed({ items }: { items: ActivityFeedItemDTO[] }) {
  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Feed</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing from friends yet. Add friends to see their trinket claims here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={`${item.userId}-${item.occurredAt}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center text-xl leading-none">
                {item.trinket?.emoji ?? <CoinIcon className="h-5 w-5 text-amber-500" />}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-gray-900">{item.username}</span>{" "}
                <span className="text-gray-600">{describe(item)}</span>
              </span>
              <span className="shrink-0 text-xs text-gray-400">{timeAgo(item.occurredAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
