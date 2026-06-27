import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        f.id,
        f.name,
        f.date,
        f.end_date,
        f.date_tbc,
        f.fixture_number,
        f.booking_open,
        f.max_places,
        f.price_per_person,
        f.cancellation_days,
        string_agg(v.name, ', ' ORDER BY fv.sort_order) AS venues,
        COUNT(b.id) FILTER (WHERE b.status = 'CONFIRMED') AS confirmed,
        COUNT(b.id) FILTER (WHERE b.status = 'PENDING') AS pending,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED') AS cancelled
      FROM fixtures f
      LEFT JOIN fixture_venues fv ON fv.fixture_id = f.id
      LEFT JOIN venues v ON v.id = fv.venue_id
      LEFT JOIN bookings b ON b.fixture_id = f.id
      GROUP BY f.id
      ORDER BY f.date
    `);
    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}
