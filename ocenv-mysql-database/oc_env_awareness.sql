-- oc_env_portal_setup.sql
-- Full reset + setup for:
--   visitors (unique people; stores quiz best/completed)
--   visits   (every login event)

-- 1) Database
CREATE DATABASE IF NOT EXISTS oc_env_portal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE oc_env_portal;

-- 2) Reset app user (dev-safe). Run as root.
DROP USER IF EXISTS 'ocapp'@'localhost';
DROP USER IF EXISTS 'ocapp'@'127.0.0.1';
DROP USER IF EXISTS 'ocapp'@'%';

CREATE USER 'ocapp'@'localhost' IDENTIFIED BY 'ocapp_pass';
CREATE USER 'ocapp'@'127.0.0.1' IDENTIFIED BY 'ocapp_pass';
CREATE USER 'ocapp'@'%' IDENTIFIED BY 'ocapp_pass';

GRANT ALL PRIVILEGES ON oc_env_portal.* TO 'ocapp'@'localhost';
GRANT ALL PRIVILEGES ON oc_env_portal.* TO 'ocapp'@'127.0.0.1';
GRANT ALL PRIVILEGES ON oc_env_portal.* TO 'ocapp'@'%';
FLUSH PRIVILEGES;

-- 3) Drop tables (order matters because of FK)
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS visitors;

-- 4) Visitors table (unique people + quiz tracking)
CREATE TABLE visitors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  occ_student_id VARCHAR(9) NULL,
  role VARCHAR(20) NOT NULL,

  first_seen TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_seen  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  quiz_completed TINYINT(1) NOT NULL DEFAULT 0,
  quiz_best_score INT NOT NULL DEFAULT 0,
  quiz_best_at TIMESTAMP(6) NULL,

  UNIQUE KEY uk_visitors_occ_id (occ_student_id),
  KEY idx_visitors_role (role),
  KEY idx_visitors_last_seen (last_seen),
  KEY idx_visitors_quiz_completed (quiz_completed),
  KEY idx_visitors_quiz_best_score (quiz_best_score)
);

-- 5) Visits table (every login = one row)
CREATE TABLE visits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  KEY idx_visits_created_at (created_at),
  KEY idx_visits_visitor_id (visitor_id),

  CONSTRAINT fk_visits_visitor
    FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- 6) Sanity checks
SELECT user, host, plugin FROM mysql.user WHERE user='ocapp';
SHOW GRANTS FOR 'ocapp'@'localhost';
SHOW GRANTS FOR 'ocapp'@'127.0.0.1';
SHOW GRANTS FOR 'ocapp'@'%';

SHOW TABLES;
SHOW COLUMNS FROM visitors;
SHOW COLUMNS FROM visits;
SHOW INDEX FROM visitors;
SHOW INDEX FROM visits;