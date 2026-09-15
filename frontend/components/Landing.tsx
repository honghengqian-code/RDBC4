import { Briefcase, Search } from "lucide-react";
import Link from "next/link";
import ui from "./ui.module.css";
import styles from "./Landing.module.css";

export default function Landing({ openCount }: { openCount: number }) {
  return (
    <>
      <div className={styles.hero}>
        <p className="eyebrow">Noticeboard</p>
        <h1 className={styles.headline}>Every open role, one board.</h1>
        <p className={styles.dek}>
          No accounts, no dashboards. Employers post a role in under a minute; job seekers search, apply, and
          attach a resume — done.
        </p>
        <div className={styles.heroStat}>
          <strong>{openCount}</strong> open role{openCount === 1 ? "" : "s"} live right now
        </div>
      </div>

      <div className={styles.paths}>
        <div className={styles.pathCard}>
          <div className={styles.pathIcon}>
            <Search size={18} strokeWidth={2.25} aria-hidden="true" />
          </div>
          <h2>Looking for work</h2>
          <p>Browse open roles by title, company or location, then apply straight from the listing.</p>
          <div className={styles.pathActions}>
            <Link href="/jobs" className={styles.ctaBtn}>
              Browse jobs
            </Link>
          </div>
        </div>

        <div className={styles.pathCard}>
          <div className={styles.pathIcon}>
            <Briefcase size={18} strokeWidth={2.25} aria-hidden="true" />
          </div>
          <h2>Hiring</h2>
          <p>Sign in to post a role, then come back anytime to see who&apos;s applied.</p>
          <div className={styles.pathActions}>
            <Link href="/employer" className={styles.ctaBtn}>
              Employer sign in
            </Link>
            <Link href="/employer/register" className={ui.ghostLink}>
              Create an account →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
