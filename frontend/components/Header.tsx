"use client";

import { Pin } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import styles from "./Header.module.css";

const SEEKER_TABS = [
  { href: "/jobs", label: "Browse jobs", match: (path: string) => path === "/jobs" },
  { href: "/apply", label: "Apply", match: (path: string) => path.startsWith("/apply") || path.includes("/apply") },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { employer, logout } = useAuth();

  const employerTab = {
    href: employer ? "/employer/dashboard" : "/employer",
    label: employer ? "Dashboard" : "Employers",
    match: (path: string) => path.startsWith("/employer") || path.includes("/applicants"),
  };
  const tabs = [...SEEKER_TABS, employerTab];

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className={styles.topbar}>
      <Link href="/" className={styles.brand}>
        <div className={styles.brandMark}>
          <Pin size={20} strokeWidth={2.25} aria-hidden="true" />
          Noticeboard
        </div>
        <p className={styles.brandTag}>The simplest job board</p>
      </Link>

      <div className={styles.right}>
        <nav className={styles.tabs} aria-label="Primary">
          {tabs.map((tab) => {
            const isActive = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {employer && (
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
