-- ═══════════════════════════════════════════════════════════════
-- Cleanup duplicate seed data (keep only 5 properties, 8 WOs)
-- ═══════════════════════════════════════════════════════════════

-- Keep only the 5 main properties (by address), delete extras
DELETE FROM work_orders
WHERE property_id IN (
  SELECT id FROM properties p
  WHERE p.id NOT IN (
    SELECT DISTINCT ON (address) id
    FROM properties
    ORDER BY address, created_at ASC
  )
);

DELETE FROM components
WHERE property_id IN (
  SELECT id FROM properties p
  WHERE p.id NOT IN (
    SELECT DISTINCT ON (address) id
    FROM properties
    ORDER BY address, created_at ASC
  )
);

DELETE FROM payment_requests
WHERE property_id IN (
  SELECT id FROM properties p
  WHERE p.id NOT IN (
    SELECT DISTINCT ON (address) id
    FROM properties
    ORDER BY address, created_at ASC
  )
);

DELETE FROM properties
WHERE id NOT IN (
  SELECT DISTINCT ON (address) id
  FROM properties
  ORDER BY address, created_at ASC
);

-- Also remove duplicate work orders (keep oldest by title)
DELETE FROM work_orders
WHERE id NOT IN (
  SELECT DISTINCT ON (title) id
  FROM work_orders
  ORDER BY title, created_at ASC
);

-- Remove duplicate reviews
DELETE FROM reviews
WHERE id NOT IN (
  SELECT DISTINCT ON (text) id
  FROM reviews
  ORDER BY text, created_at ASC
);
