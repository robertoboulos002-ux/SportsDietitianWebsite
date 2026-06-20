-- Run this against your existing database:
--   mysql -u root -p sport_dietitian < backend/db/migration_002_availability_windows.sql

USE sport_dietitian;

CREATE TABLE IF NOT EXISTS availability_windows (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_availability_windows_date (date)
) ENGINE=InnoDB;
