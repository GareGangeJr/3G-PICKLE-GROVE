"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn-ghost text-sm md:text-base"
      onClick={logout}
      disabled={pending}
    >
      {pending ? "…" : "Log out"}
    </button>
  );
}
