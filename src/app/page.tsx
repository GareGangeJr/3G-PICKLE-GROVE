import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND_NAME, FACEBOOK_PAGE_URL } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-paper">
      <div className="absolute inset-0">
        <Image
          src="/brand/court.png"
          alt={`${BRAND_NAME} outdoor court`}
          fill
          priority
          className="hero-kenburns object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(182,255,0,0.12),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />

        <section className="flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-6 text-center md:px-8">
          <Image
            src="/brand/logo.png"
            alt={BRAND_NAME}
            width={280}
            height={280}
            priority
            unoptimized
            className="fade-up h-[min(58vw,280px)] w-[min(58vw,280px)] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          />
          <div className="fade-up-delay mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              href="/schedule"
              className="btn-primary min-h-14 w-full px-5 text-center text-[1.15rem] sm:w-56"
            >
              See available schedules
            </Link>
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 w-full items-center justify-center border-2 border-white bg-[#5B9BD5] px-5 text-center font-display text-[1.15rem] uppercase tracking-[0.06em] text-white transition-transform hover:bg-[#4A8BC4] hover:translate-y-[-1px] sm:w-56"
            >
              Message us on Facebook
            </a>
          </div>
        </section>

        <div className="px-5 pb-5 md:px-8">
          <Link
            href="/admin"
            className="inline-block text-[11px] tracking-[0.14em] text-white/40 transition-colors hover:text-white/70"
          >
            Staff
          </Link>
        </div>
      </div>
    </main>
  );
}
