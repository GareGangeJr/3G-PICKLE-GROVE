import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <SiteHeader compact />
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-lime">404</p>
        <h1 className="font-display mt-2 text-5xl uppercase">Court not found</h1>
        <p className="mt-3 text-muted">That page doesn’t exist.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">
          Back home
        </Link>
      </div>
    </main>
  );
}
