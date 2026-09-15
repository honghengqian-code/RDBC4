"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon, LocationIcon } from "./icons";
import styles from "./JobSearchForm.module.css";

/**
 * Search bar for JobList. Debounces input and pushes `title`/`location`
 * into the URL so results, filtering and navigation state all live in one
 * place — matching the backend's `GET /api/jobs?title=&location=` contract.
 */
export default function JobSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (title) params.set("title", title);
      if (location) params.set("location", location);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, location]);

  return (
    <div className={styles.searchRow}>
      <div className={styles.fieldInline}>
        <SearchIcon />
        <input
          id="searchTitle"
          type="text"
          placeholder="Search by title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className={styles.fieldInline}>
        <LocationIcon />
        <input
          id="searchLocation"
          type="text"
          placeholder="Search by location…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          autoComplete="off"
        />
      </div>
      <Link href="/employer" className={styles.postCta}>
        + Post a role
      </Link>
    </div>
  );
}
