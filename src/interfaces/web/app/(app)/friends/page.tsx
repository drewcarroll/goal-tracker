import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { FriendsView } from "@/interfaces/web/components/friends/FriendsView";

export const metadata: Metadata = { title: "Friends · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const { getFriendsListUseCase, getPendingFriendRequestsUseCase } = getContainer();
  const userId = currentUserId();

  const [friends, pending] = await Promise.all([
    getFriendsListUseCase.execute({ userId }),
    getPendingFriendRequestsUseCase.execute({ userId }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        <p className="mt-1 text-sm text-gray-500">
          See how they&apos;re doing, if they&apos;ve made their goals public.
        </p>
      </div>
      <FriendsView
        initialFriends={friends}
        initialIncoming={pending.incoming}
        initialOutgoing={pending.outgoing}
      />
    </section>
  );
}
