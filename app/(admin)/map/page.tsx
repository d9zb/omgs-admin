"use client";

import dynamic from "next/dynamic";

const MembersMap = dynamic(() => import("@/components/MembersMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-gray-400">
      Loading map…
    </div>
  ),
});

export default function MapPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Members Map</h1>
      <MembersMap />
    </div>
  );
}
