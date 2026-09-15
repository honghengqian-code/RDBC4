"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

const TABS = [
  { href: "/", label: "Browse jobs", match: (path: string) => path === "/" },
  { href: "/post", label: "Post a role", match: (path: string) => path.startsWith("/post") },
  { href: "/apply", label: "Apply", match: (path: string) => path.startsWith("/apply") || path.includes("/apply") },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <div className={styles.topbar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <span aria-hidden="true">📌</span>
          Noticeboard
        </div>
        <p className={styles.brandTag}>The simplest job board — post a role, search open ones, apply in a few fields.</p>
      </div>

      <nav className={styles.tabs} aria-label="Primary">
        {TABS.map((tab) => {
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
    </div>
  );
}
