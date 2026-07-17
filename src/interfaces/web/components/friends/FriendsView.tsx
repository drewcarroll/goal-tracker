"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { FriendSummaryDTO, FriendshipDTO } from "@/application/dtos/FriendshipDTO";
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  declineFriendRequestAction,
  cancelFriendRequestAction,
} from "@/interfaces/web/app/(app)/friends/actions";

/**
 * Friends tab: send a request by username, respond to incoming requests,
 * see outgoing ones still pending, and list accepted friends (each linking
 * to their public-only view).
 */
export function FriendsView({
  initialFriends,
  initialIncoming,
  initialOutgoing,
}: {
  initialFriends: FriendSummaryDTO[];
  initialIncoming: FriendshipDTO[];
  initialOutgoing: FriendshipDTO[];
}) {
  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);

  function onAccepted(friendship: FriendshipDTO, viewerId: string) {
    setIncoming((prev) => prev.filter((f) => f.id !== friendship.id));
    const otherUserId =
      friendship.requesterId === viewerId ? friendship.addresseeId : friendship.requesterId;
    const otherUsername =
      friendship.requesterId === viewerId
        ? friendship.addresseeUsername
        : friendship.requesterUsername;
    setFriends((prev) => [
      ...prev,
      { friendshipId: friendship.id, userId: otherUserId, username: otherUsername },
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <SendRequestForm
        onSent={(f) => setOutgoing((prev) => [...prev, f])}
      />

      {incoming.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Friend requests
          </h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((f) => (
              <IncomingRequestCard
                key={f.id}
                friendship={f}
                onAccepted={(friendship) => onAccepted(friendship, friendship.addresseeId)}
                onDeclined={() => setIncoming((prev) => prev.filter((x) => x.id !== f.id))}
              />
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sent, awaiting a response
          </h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <OutgoingRequestCard
                key={f.id}
                friendship={f}
                onCancelled={() => setOutgoing((prev) => prev.filter((x) => x.id !== f.id))}
              />
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Friends
        </h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No friends yet. Send a request above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((f) => (
              <li key={f.friendshipId}>
                <Link
                  href={`/friends/${f.username}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
                >
                  <span className="font-medium text-gray-900">{f.username}</span>
                  <span className="text-sm text-brand">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SendRequestForm({ onSent }: { onSent: (friendship: FriendshipDTO) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setMessage(null);
    if (!username.trim()) {
      setError("Type a username.");
      return;
    }
    startTransition(async () => {
      const result = await sendFriendRequestAction(username.trim());
      if (result.ok) {
        onSent(result.friendship);
        setUsername("");
        setMessage(`Request sent to ${result.friendship.addresseeUsername}.`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <label htmlFor="friend-username" className="text-sm font-medium text-gray-700">
        Add a friend
      </label>
      <div className="flex gap-2">
        <input
          id="friend-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Their username"
          className="w-full min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </div>
  );
}

function IncomingRequestCard({
  friendship,
  onAccepted,
  onDeclined,
}: {
  friendship: FriendshipDTO;
  onAccepted: (friendship: FriendshipDTO) => void;
  onDeclined: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptFriendRequestAction(friendship.id);
      if (result.ok) {
        onAccepted(friendship);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDecline() {
    setError(null);
    startTransition(async () => {
      const result = await declineFriendRequestAction(friendship.id);
      if (result.ok) {
        onDeclined();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-gray-900">{friendship.requesterUsername}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={pending}
            className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function OutgoingRequestCard({
  friendship,
  onCancelled,
}: {
  friendship: FriendshipDTO;
  onCancelled: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelFriendRequestAction(friendship.id);
      if (result.ok) {
        onCancelled();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-gray-900">{friendship.addresseeUsername}</span>
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? "…" : "Cancel"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}
