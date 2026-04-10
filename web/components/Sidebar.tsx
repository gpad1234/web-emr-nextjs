"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/patients",
    label: "Patients",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/patients/new",
    label: "Add Patient",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const wordmark = (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-tight tracking-tight">MobileEMR</p>
        <p className="text-slate-400 text-xs">Clinical Workspace</p>
      </div>
    </div>
  );

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      <p className="px-3 mb-2 text-slate-500 text-[0.65rem] font-semibold uppercase tracking-widest">
        Navigation
      </p>
      {navItems.map(({ href, label, icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const censusStrip = (
    <div className="px-4 py-4 border-t border-slate-800">
      <p className="text-slate-500 text-[0.65rem] font-semibold uppercase tracking-widest mb-3">
        Census
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Critical",   dot: "bg-red-500",     value: "4"  },
          { label: "Recovering", dot: "bg-amber-400",   value: "11" },
          { label: "Stable",     dot: "bg-emerald-400", value: "28" },
          { label: "Discharged", dot: "bg-slate-500",   value: "5"  },
        ].map(({ label, dot, value }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-slate-400 text-xs truncate">{label}</span>
            <span className="ml-auto text-white text-xs font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar (hidden on md+) ────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 top-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 z-30">
        <button
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="ml-3">{wordmark}</div>
      </div>

      {/* ── Backdrop (mobile only) ─────────────────────────────────────── */}
      {open && (
        <div
          aria-hidden="true"
          className="md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar drawer ────────────────────────────────────────────── */}
      {/*  Mobile:  slides in/out from the left, above the backdrop       */}
      {/*  Desktop: always visible, static position                       */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0 md:z-20
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Wordmark header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          {wordmark}
          {/* Close button — mobile only */}
          <button
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {navLinks}
        {censusStrip}
      </aside>
    </>
  );
}
