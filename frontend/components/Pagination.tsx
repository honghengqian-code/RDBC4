import Link from "next/link";
import styles from "./Pagination.module.css";

export default function Pagination({
  count,
  pageSize,
  currentPage,
  makeHref,
}: {
  count: number;
  pageSize: number;
  currentPage: number;
  makeHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Link
        href={makeHref(currentPage - 1)}
        className={styles.pageBtn}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
      >
        ← Prev
      </Link>
      <span className={styles.pageStatus}>
        Page {currentPage} of {totalPages}
      </span>
      <Link
        href={makeHref(currentPage + 1)}
        className={styles.pageBtn}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
      >
        Next →
      </Link>
    </nav>
  );
}
