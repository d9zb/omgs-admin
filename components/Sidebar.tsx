"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/map", label: "Members Map" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/bookings", label: "Bookings" },
  { href: "/subs", label: "Annual Subs" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-green-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-green-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-400">OMGS</p>
        <p className="text-sm font-medium mt-0.5">Committee Admin</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-green-700 text-white"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post" className="px-6 py-4 border-t border-green-800">
        <button
          type="submit"
          className="text-xs text-green-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
