import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/config";
import { LogoutButton } from "@/components/LogoutButton";

export function SiteHeader({
  compact = false,
  showLogout = false,
}: {
  compact?: boolean;
  showLogout?: boolean;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 md:px-8">
      <Link href="/" className="inline-flex shrink-0 items-center">
        <Image
          src="/brand/logo.png"
          alt={BRAND_NAME}
          width={64}
          height={64}
          className={compact ? "h-12 w-12 object-contain" : "h-16 w-16 object-contain"}
          priority
          unoptimized
        />
      </Link>
      {showLogout ? <LogoutButton /> : null}
    </header>
  );
}
