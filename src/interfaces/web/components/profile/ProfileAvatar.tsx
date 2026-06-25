import Image from "next/image";

interface ProfileAvatarProps {
  image: string | null;
  name: string | null;
  email: string | null;
}

/** Up to two initials derived from the name, falling back to the email. */
function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) {
    return "?";
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * The signed-in user's Google avatar, or a circular initials placeholder when
 * no avatar URL is available.
 */
export function ProfileAvatar({ image, name, email }: ProfileAvatarProps) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ? `${name}'s avatar` : "Your avatar"}
        width={96}
        height={96}
        className="h-24 w-24 rounded-full object-cover ring-1 ring-gray-200"
        priority
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-2xl font-semibold text-brand ring-1 ring-brand/20"
    >
      {initials(name, email)}
    </div>
  );
}
