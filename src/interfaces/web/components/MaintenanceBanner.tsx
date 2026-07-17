/**
 * The maintenance trip-wire (user requirement, 2026-07-16): if the current
 * month has no entry in BattlePassCalendarMap (which only defines July 2026
 * through June 2027, deliberately, so it can never silently cycle), the app
 * must fail safe and loud rather than crash or show broken trinket content.
 * Rendered by (app)/layout.tsx in place of all normal app content.
 */
export function MaintenanceBanner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600 p-6 text-center">
      <p className="max-w-sm text-lg font-semibold text-white">
        The app is currently experiencing difficulties. Please come back later.
      </p>
    </div>
  );
}
