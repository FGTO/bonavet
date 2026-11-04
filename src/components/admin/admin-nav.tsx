"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type MessageKey } from "@/i18n";

const LINKS: { href: string; label: MessageKey }[] = [
  { href: "/admin", label: "admin.nav.overview" },
  { href: "/admin/members", label: "admin.nav.members" },
  { href: "/admin/calendars", label: "admin.nav.calendars" },
  { href: "/admin/tasks", label: "admin.nav.tasks" },
  { href: "/admin/screens", label: "admin.nav.screens" },
];

export function AdminNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/sign-in")) return null;
  return (
    <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-control px-4 py-2 text-body-sm font-semibold transition-colors ${
              active ? "bg-inkwell-navy text-paper-white" : "text-graphite hover:bg-paper-white"
            }`}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
