import Link from "next/link";
import ui from "@/components/ui.module.css";

export default function NotFound() {
  return (
    <section>
      <div className={ui.panelHead}>
        <p className="eyebrow">404</p>
        <h2>Role not found</h2>
        <p className={ui.dek}>It may have been removed, or the link might be off.</p>
      </div>
      <Link href="/" className={ui.successLink}>
        Back to Browse jobs →
      </Link>
    </section>
  );
}
