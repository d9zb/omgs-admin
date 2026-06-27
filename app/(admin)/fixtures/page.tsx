"use client";

import { useEffect, useState } from "react";

interface Fixture {
  id: number;
  name: string;
  date: string;
  end_date: string | null;
  date_tbc: boolean;
  fixture_number: number | null;
  booking_open: boolean;
  max_places: number | null;
  price_per_person: string | null;
  venues: string | null;
  confirmed: number;
  pending: number;
  cancelled: number;
}

function formatDate(date: string, endDate: string | null, tbc: boolean): string {
  const d = new Date(date);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const start = d.toLocaleDateString("en-GB", opts);
  if (endDate) {
    const end = new Date(endDate).toLocaleDateString("en-GB", opts);
    return `${start} – ${end}`;
  }
  return tbc ? `${start} (TBC)` : start;
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((data) => { setFixtures(data); setLoading(false); });
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = fixtures.filter((f) => f.date >= today);
  const past = fixtures.filter((f) => f.date < today);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Fixtures</h1>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <>
          <FixtureTable title="Upcoming" fixtures={upcoming} />
          {past.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-800">
                Past fixtures ({past.length})
              </summary>
              <div className="mt-3">
                <FixtureTable title="" fixtures={[...past].reverse()} />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function FixtureTable({ title, fixtures }: { title: string; fixtures: Fixture[] }) {
  if (fixtures.length === 0) return null;

  return (
    <div>
      {title && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
            <th className="pb-2 pr-4 w-6">#</th>
            <th className="pb-2 pr-4">Fixture</th>
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Venue</th>
            <th className="pb-2 pr-4">Price</th>
            <th className="pb-2 pr-4 text-center">Bookings</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((f) => {
            const total = f.confirmed + f.pending;
            const isFull = f.max_places !== null && total >= f.max_places;

            return (
              <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 text-gray-400 tabular-nums">
                  {f.fixture_number ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900">{f.name}</td>
                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                  {formatDate(f.date, f.end_date, f.date_tbc)}
                </td>
                <td className="py-3 pr-4 text-gray-500">{f.venues ?? "—"}</td>
                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                  {f.price_per_person ? `£${parseFloat(f.price_per_person).toFixed(0)}` : "—"}
                </td>
                <td className="py-3 pr-4 text-center tabular-nums">
                  {f.fixture_number ? (
                    <span className={isFull ? "text-red-600 font-medium" : "text-gray-700"}>
                      {f.confirmed}
                      {f.pending > 0 && <span className="text-amber-500"> +{f.pending}</span>}
                      {f.max_places && <span className="text-gray-400"> / {f.max_places}</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-3">
                  {f.fixture_number ? (
                    f.booking_open ? (
                      isFull
                        ? <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Full</span>
                        : <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Open</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Closed</span>
                    )
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-500">Diary</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
