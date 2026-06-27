import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const client = await pool.connect();
  try {
    const [membersResult, venuesResult] = await Promise.all([
      client.query(`
        SELECT
          m.id,
          TRIM(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')) AS name,
          m.membership_type,
          a.line1,
          a.city,
          a.county,
          a.postcode,
          ST_Y(a.location::geometry) AS lat,
          ST_X(a.location::geometry) AS lng,
          (
            SELECT string_agg(
              CASE WHEN p.number LIKE '44%' THEN '0' || substring(p.number FROM 3) ELSE p.number END,
              ', ' ORDER BY p.is_primary DESC, p.type
            )
            FROM member_phones p WHERE p.member_id = m.id
          ) AS phones,
          (
            SELECT string_agg(e.email, ', ' ORDER BY e.is_primary DESC)
            FROM member_emails e WHERE e.member_id = m.id
          ) AS emails,
          (
            SELECT MAX(h.leaving_year)
            FROM member_houses h WHERE h.member_id = m.id
          ) AS leaving_year,
          (
            SELECT string_agg(h.house_no, ',' ORDER BY h.leaving_year DESC)
            FROM member_houses h WHERE h.member_id = m.id
          ) AS houses
        FROM members m
        JOIN member_addresses a ON a.member_id = m.id AND a.is_primary = true
        WHERE a.location IS NOT NULL
        ORDER BY m.last_name, m.first_name
      `),
      client.query(`
        SELECT
          id,
          name,
          city,
          postcode,
          ST_Y(location::geometry) AS lat,
          ST_X(location::geometry) AS lng
        FROM venues
        WHERE location IS NOT NULL
        ORDER BY name
      `),
    ]);

    return NextResponse.json({
      members: membersResult.rows,
      venues: venuesResult.rows,
    });
  } finally {
    client.release();
  }
}
