"use client";

import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Member {
  id: number;
  name: string;
  membership_type: string;
  line1: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  lat: number;
  lng: number;
  phones: string | null;
  emails: string | null;
  leaving_year: number | null;
  houses: string | null;
}

interface Venue {
  id: number;
  name: string;
  city: string | null;
  postcode: string | null;
  lat: number;
  lng: number;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MembersMap() {
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const innerCircleRef = useRef<L.Circle | null>(null);
  const memberLayerRef = useRef<L.LayerGroup | null>(null);
  const venueLayerRef = useRef<L.LayerGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const venuesRef = useRef<Venue[]>([]);

  const [members, setMembers] = useState<Member[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  useEffect(() => { venuesRef.current = venues; }, [venues]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [minRadius, setMinRadius] = useState(0);
  const [radius, setRadius] = useState(30);
  const [minYear, setMinYear] = useState(1947);
  const [maxYear, setMaxYear] = useState(2025);
  const ALL_HOUSES = ['1','2','3','4','5','6','7','8','9','SH'];
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set(ALL_HOUSES));
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const headerCheckRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    fetch("/api/map-data")
      .then((r) => r.json())
      .then(({ members, venues }) => {
        setMembers(members);
        setVenues(venues);
        setLoading(false);
      });
  }, []);

  // Initialise map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [52.5, -1.8],
      zoom: 7,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    memberLayerRef.current = L.layerGroup().addTo(map);
    venueLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render venue pins
  useEffect(() => {
    if (!mapRef.current || !venueLayerRef.current || venues.length === 0) return;

    venueLayerRef.current.clearLayers();

    const venueIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:20px;height:20px;border-radius:50% 50% 50% 0;
        background:#15803d;border:2px solid #fff;
        transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 20],
      popupAnchor: [0, -30],
    });

    venues.forEach((v) => {
      const marker = L.marker([v.lat, v.lng], { icon: venueIcon });
      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:160px">
          <strong style="font-size:13px">${v.name}</strong>
          ${v.city ? `<div style="color:#555;font-size:12px">${v.city}${v.postcode ? `, ${v.postcode}` : ""}</div>` : ""}
          <button
            onclick="window.omgsSelectVenue(${v.id})"
            style="margin-top:8px;padding:4px 10px;background:#15803d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px"
          >Filter by radius</button>
        </div>`
      );
      venueLayerRef.current!.addLayer(marker);
    });
  }, [venues]);

  // Expose venue selector to popup buttons
  useEffect(() => {
    (window as typeof window & { omgsSelectVenue: (id: number) => void }).omgsSelectVenue = (id: number) => {
      setSelectedVenueId(id);
      setMinRadius(0);
      setRadius(30);
      const v = venuesRef.current.find((v) => v.id === id);
      if (v && mapRef.current) {
        mapRef.current.closePopup();
        mapRef.current.flyTo([v.lat, v.lng], 9, { duration: 1 });
      }
    };
  }, []);

  // Render member pins + circle when filter changes
  useEffect(() => {
    if (!mapRef.current || !memberLayerRef.current) return;

    memberLayerRef.current.clearLayers();
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
    if (innerCircleRef.current) {
      innerCircleRef.current.remove();
      innerCircleRef.current = null;
    }

    const venue = venues.find((v) => v.id === selectedVenueId) ?? null;

    if (venue) {
      circleRef.current = L.circle([venue.lat, venue.lng], {
        radius: radius * 1609.344,
        color: "#15803d",
        fillColor: "#15803d",
        fillOpacity: 0.06,
        weight: 2,
      }).addTo(mapRef.current);

      if (minRadius > 0) {
        innerCircleRef.current = L.circle([venue.lat, venue.lng], {
          radius: minRadius * 1609.344,
          color: "#15803d",
          fillColor: "#fff",
          fillOpacity: 0.5,
          weight: 2,
          dashArray: "5 4",
        }).addTo(mapRef.current);
      }
    }

    members.forEach((m) => {
      const dist = venue ? haversineMiles(m.lat, m.lng, venue.lat, venue.lng) : null;
      const inRadius =
        venue === null ||
        (dist! >= minRadius && dist! <= radius);

      const colour = inRadius ? "#1d4ed8" : "#94a3b8";
      const size = inRadius ? 14 : 10;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${colour};border:2px solid #fff;
          box-shadow:0 1px 3px rgba(0,0,0,.35)
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
      });

      const addressParts = [m.line1, m.city, m.county, m.postcode].filter(Boolean);
      const popup = `
        <div style="font-family:sans-serif;min-width:180px">
          <strong style="font-size:13px">${m.name}</strong>
          ${m.membership_type ? `<span style="margin-left:6px;font-size:10px;background:#e2e8f0;padding:1px 5px;border-radius:3px">${m.membership_type}</span>` : ""}
          ${addressParts.length ? `<div style="color:#555;font-size:12px;margin-top:4px">${addressParts.join(", ")}</div>` : ""}
          ${m.leaving_year ? `<div style="font-size:12px;margin-top:4px;color:#555">Left ${m.leaving_year} · ~${2026 - m.leaving_year + 18} yrs${m.houses ? ` · House ${m.houses.split(',')[0]}` : ""}</div>` : ""}
          ${m.phones ? `<div style="font-size:12px;margin-top:4px">📞 ${m.phones}</div>` : ""}
          ${m.emails ? `<div style="font-size:12px;margin-top:2px">✉️ <a href="mailto:${m.emails.split(", ")[0]}">${m.emails}</a></div>` : ""}
        </div>`;

      L.marker([m.lat, m.lng], { icon })
        .bindPopup(popup)
        .addTo(memberLayerRef.current!);
    });
  }, [members, venues, selectedVenueId, minRadius, radius]);

  const selectedVenue = venues.find((v) => v.id === selectedVenueId) ?? null;

  const filteredMembers = (selectedVenue
    ? members
        .map((m) => ({ ...m, distance: haversineMiles(m.lat, m.lng, selectedVenue.lat, selectedVenue.lng) }))
        .filter((m) => m.distance >= minRadius && m.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
    : members.map((m) => ({ ...m, distance: null }))
  ).filter((m) => {
    if (m.leaving_year !== null && (m.leaving_year < minYear || m.leaving_year > maxYear)) return false;
    if (selectedHouses.size > 0 && selectedHouses.size < ALL_HOUSES.length) {
      const memberHouses = m.houses ? m.houses.split(',') : [];
      if (memberHouses.length === 0) return true; // no house data — include
      if (!memberHouses.some((h) => selectedHouses.has(h))) return false;
    }
    return true;
  });

  const visibleCount = filteredMembers.length;

  // Reset checkboxes whenever the filtered list changes
  useEffect(() => {
    setCheckedIds(new Set(filteredMembers.map((m) => m.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVenueId, minRadius, radius, minYear, maxYear, selectedHouses, members]);

  // Drive indeterminate state on header checkbox
  useEffect(() => {
    if (!headerCheckRef.current) return;
    const allChecked = filteredMembers.length > 0 && filteredMembers.every((m) => checkedIds.has(m.id));
    const someChecked = filteredMembers.some((m) => checkedIds.has(m.id));
    headerCheckRef.current.checked = allChecked;
    headerCheckRef.current.indeterminate = someChecked && !allChecked;
  }, [checkedIds, filteredMembers]);

  const checkedMembers = filteredMembers.filter((m) => checkedIds.has(m.id));

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Venue</label>
          <select
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
            value={selectedVenueId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedVenueId(id);
              if (id) {
                setMinRadius(0);
                setRadius(30);
                const v = venues.find((v) => v.id === id);
                if (v && mapRef.current) mapRef.current.flyTo([v.lat, v.lng], 9, { duration: 1 });
              } else {
                mapRef.current?.flyTo([52.5, -1.8], 7, { duration: 1 });
              }
            }}
          >
            <option value="">All members</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            From: <span className="text-green-700 font-semibold">{minRadius} mi</span>
          </label>
          <input
            type="range"
            min={0}
            max={radius - 5}
            step={5}
            value={minRadius}
            disabled={!selectedVenueId}
            onChange={(e) => setMinRadius(Number(e.target.value))}
            className="w-28 accent-green-700 disabled:opacity-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            To: <span className="text-green-700 font-semibold">{radius} mi</span>
          </label>
          <input
            type="range"
            min={minRadius + 5}
            max={100}
            step={5}
            value={radius}
            disabled={!selectedVenueId}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-28 accent-green-700 disabled:opacity-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Left: <span className="text-green-700 font-semibold">{minYear}</span> <span className="text-gray-400">(~{2026 - minYear + 18})</span>
          </label>
          <input
            type="range"
            min={1947}
            max={maxYear - 1}
            step={1}
            value={minYear}
            onChange={(e) => setMinYear(Number(e.target.value))}
            className="w-28 accent-green-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            to <span className="text-green-700 font-semibold">{maxYear}</span> <span className="text-gray-400">(~{2026 - maxYear + 18})</span>
          </label>
          <input
            type="range"
            min={minYear + 1}
            max={2025}
            step={1}
            value={maxYear}
            onChange={(e) => setMaxYear(Number(e.target.value))}
            className="w-28 accent-green-700"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">House</span>
          {ALL_HOUSES.map((h) => (
            <button
              key={h}
              onClick={() => {
                const next = new Set(selectedHouses);
                next.has(h) ? next.delete(h) : next.add(h);
                setSelectedHouses(next);
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                selectedHouses.has(h)
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-400 border-gray-300"
              }`}
            >
              {h}
            </button>
          ))}
          <button
            onClick={() => setSelectedHouses(new Set(ALL_HOUSES))}
            className="text-xs text-gray-400 hover:text-gray-700 underline ml-1"
          >
            all
          </button>
          <button
            onClick={() => setSelectedHouses(new Set())}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            none
          </button>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {loading ? (
            "Loading…"
          ) : (
            <>
              <span className="font-semibold text-gray-800">{visibleCount}</span>
              {selectedVenue
                ? minRadius > 0
                  ? ` between ${minRadius}–${radius} mi of ${selectedVenue.name}`
                  : ` within ${radius} mi of ${selectedVenue.name}`
                : ` members`}
              {" "}· {members.length} total geocoded
            </>
          )}
        </div>

        {selectedVenueId && (
          <button
            onClick={() => {
              setSelectedVenueId(null);
              mapRef.current?.flyTo([52.5, -1.8], 7, { duration: 1 });
            }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-[480px] rounded-lg border border-gray-200 overflow-hidden" />

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 mb-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-700 border-2 border-white shadow" />
          Member {selectedVenueId ? "(in range)" : ""}
        </span>
        {selectedVenueId && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white shadow" />
            Outside range
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-700 border-2 border-white shadow" />
          Venue (click to filter)
        </span>
      </div>

      {/* Member list */}
      {filteredMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-700 mr-auto">
              {selectedVenue
                ? minRadius > 0
                  ? `${filteredMembers.length} members between ${minRadius}–${radius} mi of ${selectedVenue.name}`
                  : `${filteredMembers.length} members within ${radius} mi of ${selectedVenue.name}`
                : `All ${filteredMembers.length} members`}
            </h2>

            {/* Email selected */}
            <a
              href={`mailto:?bcc=${checkedMembers.filter((m) => m.emails).map((m) => m.emails).join(",")}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email {checkedMembers.filter((m) => m.emails).length}
            </a>

            {/* Copy WhatsApp numbers */}
            <button
              onClick={() => {
                const mobiles = checkedMembers
                  .flatMap((m) => (m.phones ? m.phones.split(", ") : []))
                  .filter((n) => n.startsWith("07"))
                  .join("\n");
                navigator.clipboard.writeText(mobiles).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.842L.057 23.629a.75.75 0 00.921.921l5.788-1.453A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 01-4.953-1.355l-.355-.21-3.676.923.939-3.574-.23-.368A9.713 9.713 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              {copied ? "Copied!" : `Copy ${checkedMembers.flatMap((m) => (m.phones ? m.phones.split(", ") : [])).filter((n) => n.startsWith("07")).length} numbers`}
            </button>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="pb-2 pr-3 w-8">
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    className="rounded accent-green-700 cursor-pointer"
                    onChange={(e) =>
                      setCheckedIds(e.target.checked ? new Set(filteredMembers.map((m) => m.id)) : new Set())
                    }
                  />
                </th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Left</th>
                <th className="pb-2 pr-4">House</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Email</th>
                {selectedVenue && <th className="pb-2 text-right">Miles</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className={`border-b border-gray-100 hover:bg-gray-50 ${checkedIds.has(m.id) ? "" : "opacity-40"}`}>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(m.id)}
                      className="rounded accent-green-700 cursor-pointer"
                      onChange={(e) => {
                        const next = new Set(checkedIds);
                        e.target.checked ? next.add(m.id) : next.delete(m.id);
                        setCheckedIds(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">{m.name}</td>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap tabular-nums">
                    {m.leaving_year ?? "—"}
                    {m.leaving_year && <span className="text-gray-400 text-xs ml-1">(~{2026 - m.leaving_year + 18})</span>}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                    {m.houses ? m.houses.split(',').join(', ') : "—"}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                    {[m.city, m.postcode].filter(Boolean).join(", ")}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{m.phones ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {m.emails
                      ? <a href={`mailto:${m.emails.split(", ")[0]}`} className="hover:text-green-700">{m.emails}</a>
                      : "—"}
                  </td>
                  {selectedVenue && (
                    <td className="py-2 text-right text-gray-500 whitespace-nowrap tabular-nums">
                      {m.distance!.toFixed(1)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
