-- Run this once against your MySQL server to set up the database:
--   mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS sport_dietitian
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sport_dietitian;

CREATE TABLE IF NOT EXISTS bookings (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  email             VARCHAR(190) NOT NULL,
  phone             VARCHAR(40)  NOT NULL,
  appointment_type  ENUM('consultation', 'body-composition') NOT NULL,
  preferred_date    DATE NOT NULL,
  preferred_time    TIME NOT NULL,
  notes             TEXT,
  status            ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Generated column: NULL for cancelled bookings (so they don't block a slot),
  -- otherwise "date_time" for active ones. MySQL allows multiple NULLs in a
  -- unique index, so this makes the slot unique only while a booking is live.
  active_slot       VARCHAR(20) GENERATED ALWAYS AS (
                      IF(status = 'cancelled', NULL, CONCAT(preferred_date, '_', preferred_time))
                    ) STORED,
  INDEX idx_bookings_date (preferred_date),
  INDEX idx_bookings_status (status),
  UNIQUE KEY uq_active_slot (active_slot)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(190) NOT NULL UNIQUE,
  subscribed_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
