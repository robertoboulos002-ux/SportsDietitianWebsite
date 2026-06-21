-- Run this against your existing database:
--   mysql -u root -p sport_dietitian < backend/db/migration_003_weekly_pattern.sql

USE sport_dietitian;

CREATE TABLE IF NOT EXISTS weekly_pattern (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_of_week TINYINT UNSIGNED NOT NULL, -- 0=Sunday ... 6=Saturday (Date#getDay())
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_weekly_pattern_day (day_of_week)
) ENGINE=InnoDB;
