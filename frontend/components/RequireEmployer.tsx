"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import ui from "./ui.module.css";

/** Gates a page's content behind an employer session, redirecting to sign-in otherwise. */
export default function RequireEmployer({ children }: { children: ReactNode }) {
  const { employer, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !employer) router.replace("/employer");
  }, [loading, employer, router]);

  if (loading || !employer) {
    return <p className={ui.hint}>Checking your session…</p>;
  }

  return <>{children}</>;
}
