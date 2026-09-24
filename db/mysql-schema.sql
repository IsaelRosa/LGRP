-- LGRP - schema MySQL 8.0+
-- Import this file in Hostinger hPanel > Databases > phpMyAdmin.
-- Authentication users remain in Supabase until the auth migration is implemented.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL DEFAULT '',
  role VARCHAR(30) NOT NULL DEFAULT 'Consulta',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_user_profiles_email (email),
  KEY idx_user_profiles_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS containers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  type VARCHAR(120) NOT NULL,
  material VARCHAR(120) NOT NULL DEFAULT '',
  capacity DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL DEFAULT 'L',
  status VARCHAR(40) NOT NULL DEFAULT 'Disponível',
  location VARCHAR(180) NOT NULL DEFAULT '',
  assigned_lab VARCHAR(180) NOT NULL DEFAULT '',
  expiry_date DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_containers_code (code),
  KEY idx_containers_status (status),
  KEY idx_containers_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reagents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  cas_number VARCHAR(80) NOT NULL DEFAULT '',
  lab_name VARCHAR(180) NOT NULL DEFAULT '',
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL DEFAULT 'un',
  expiry_date DATE NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Estoque',
  location VARCHAR(180) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_reagents_code (code),
  KEY idx_reagents_status (status),
  KEY idx_reagents_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wastes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  composition TEXT NOT NULL,
  lab_name VARCHAR(180) NOT NULL,
  hazard_class VARCHAR(100) NOT NULL,
  physical_state VARCHAR(60) NOT NULL DEFAULT 'Não informado',
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status VARCHAR(60) NOT NULL DEFAULT 'Gerado',
  storage_location VARCHAR(180) NOT NULL DEFAULT '',
  container_code VARCHAR(80) NOT NULL DEFAULT '',
  notes TEXT NOT NULL,
  generated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by VARCHAR(36) NULL,
  request_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_wastes_code (code),
  KEY idx_wastes_status (status),
  KEY idx_wastes_generated_at (generated_at),
  KEY idx_wastes_created_by (created_by),
  KEY idx_wastes_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waste_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  lab_name VARCHAR(180) NOT NULL,
  requester VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  hazard_class VARCHAR(100) NOT NULL,
  physical_state VARCHAR(60) NOT NULL DEFAULT 'Não informado',
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  notes TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'Recebida',
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  scheduled_at DATETIME(3) NULL,
  container_code VARCHAR(80) NOT NULL DEFAULT '',
  created_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_waste_requests_code (code),
  KEY idx_waste_requests_status (status),
  KEY idx_waste_requests_requested_at (requested_at),
  KEY idx_waste_requests_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  waste_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  gross_weight DECIMAL(14,3) NOT NULL DEFAULT 0,
  tare_weight DECIMAL(14,3) NOT NULL DEFAULT 0,
  net_weight DECIMAL(14,3) NOT NULL DEFAULT 0,
  operator VARCHAR(180) NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  notes TEXT NOT NULL,
  method VARCHAR(180) NOT NULL DEFAULT '',
  outcome VARCHAR(180) NOT NULL DEFAULT '',
  destination VARCHAR(180) NOT NULL DEFAULT '',
  manifest VARCHAR(120) NOT NULL DEFAULT '',
  container_code VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_operations_waste_id (waste_id),
  KEY idx_operations_occurred_at (occurred_at),
  CONSTRAINT fk_operations_waste FOREIGN KEY (waste_id) REFERENCES wastes (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  related_code VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  resolved_at DATETIME(3) NULL,
  resolved_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_alerts_resolved (resolved),
  KEY idx_alerts_created_at (created_at),
  KEY idx_alerts_related_code (related_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(180) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL DEFAULT '',
  details JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_logs_created_at (created_at),
  KEY idx_audit_logs_entity (entity),
  KEY idx_audit_logs_actor_email (actor_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE wastes
  ADD CONSTRAINT fk_wastes_request FOREIGN KEY (request_id) REFERENCES waste_requests (id) ON DELETE SET NULL ON UPDATE CASCADE;
