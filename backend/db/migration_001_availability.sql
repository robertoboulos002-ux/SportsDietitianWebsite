-- Run this if you already created the database from the original schema.sql.
-- It adds the generated column + unique index that stops two active bookings
-- from sharing the same date and time.
--
-- Usage:
--   mysql -u root -p sport_dietitian < backend/db/migration_001_availability.sql

USE sport_dietitian;

ALTER TABLE bookings
  ADD COLUMN active_slot VARCHAR(20) GENERATED ALWAYS AS (
    IF(status = 'cancelled', NULL, CONCAT(preferred_date, '_', preferred_time))
  ) STORED;

ALTER TABLE bookings
  ADD UNIQUE KEY uq_active_slot (active_slot);
