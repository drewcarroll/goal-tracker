import type { OwnedTrinketDTO } from "@/application/dtos/TrinketCollectionDTO";

/** The user's owned trinkets — not collect-once, so duplicates show a "×N" badge. */
export function TrinketCollection({ trinkets }: { trinkets: OwnedTrinketDTO[] }) {
  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Collection</h2>
      {trinkets.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing collected yet — claim a battle-pass day or buy from the shop.
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {trinkets.map((trinket) => (
            <div
              key={trinket.id}
              title={trinket.name}
              className="relative flex aspect-square items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl"
            >
              {trinket.emoji}
              {trinket.quantity > 1 && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 px-1 text-[9px] font-bold text-white">
                  ×{trinket.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
