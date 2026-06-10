-- Phase 1: Market-Ready Features Migration
-- Pharmacy, EHR, Insurance, Staff Roles, Security

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- 1. Expand users.role ENUM for staff roles
-- ---------------------------------------------------------
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','doctor','patient','receptionist','nurse','pharmacist','accountant') NOT NULL;

-- ---------------------------------------------------------
-- 2. Add 2FA column to users
-- ---------------------------------------------------------
ALTER TABLE `users` ADD COLUMN `two_factor_enabled` TINYINT(1) DEFAULT 0 AFTER `status`;

-- ---------------------------------------------------------
-- 3. Pharmacy Tables
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medicines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255),
  `manufacturer` VARCHAR(255),
  `category` VARCHAR(100) DEFAULT 'general',
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `reorder_level` INT DEFAULT 10,
  `expiry_date` DATE,
  `batch_number` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_medicine_name` (`name`),
  INDEX `idx_medicine_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pharmacy_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prescription_id` INT NULL,
  `patient_id` INT NOT NULL,
  `dispensed_by` INT NOT NULL,
  `order_type` ENUM('prescription','walk_in') DEFAULT 'walk_in',
  `status` ENUM('pending','dispensed','cancelled') DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dispensed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_pharm_order_patient` (`patient_id`),
  INDEX `idx_pharm_order_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pharmacy_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `pharmacy_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 4. EHR Tables
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medical_conditions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `condition_name` VARCHAR(255) NOT NULL,
  `icd10_code` VARCHAR(20),
  `diagnosis_date` DATE,
  `status` ENUM('active','resolved') DEFAULT 'active',
  `notes` TEXT,
  `diagnosed_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`diagnosed_by`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT,
  INDEX `idx_condition_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vitals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `recorded_by` INT NOT NULL,
  `height_cm` DECIMAL(5,2),
  `weight_kg` DECIMAL(5,2),
  `bp_systolic` INT,
  `bp_diastolic` INT,
  `pulse` INT,
  `temperature` DECIMAL(4,2),
  `spo2` DECIMAL(4,2),
  `notes` TEXT,
  `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_vitals_patient` (`patient_id`),
  INDEX `idx_vitals_date` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 5. Insurance Tables
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `insurance_providers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `tpa_name` VARCHAR(255),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(20),
  `address` TEXT,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_insurance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `provider_id` INT NOT NULL,
  `policy_number` VARCHAR(100) NOT NULL,
  `member_id` VARCHAR(100),
  `coverage_type` VARCHAR(100),
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NOT NULL,
  `status` ENUM('active','expired','cancelled') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`provider_id`) REFERENCES `insurance_providers`(`id`) ON DELETE RESTRICT,
  INDEX `idx_patient_insurance` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `insurance_claims` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bill_id` INT NOT NULL,
  `patient_id` INT NOT NULL,
  `provider_id` INT NOT NULL,
  `claim_number` VARCHAR(100),
  `claimed_amount` DECIMAL(10,2) NOT NULL,
  `approved_amount` DECIMAL(10,2) DEFAULT 0,
  `status` ENUM('pending','submitted','approved','rejected','partially_approved') DEFAULT 'pending',
  `submitted_date` DATE,
  `resolved_date` DATE,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`provider_id`) REFERENCES `insurance_providers`(`id`) ON DELETE RESTRICT,
  INDEX `idx_claim_status` (`status`),
  INDEX `idx_claim_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 6. Security: OTP Table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `purpose` ENUM('login','reset') DEFAULT 'login',
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_otp_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 7. Enhance audit_logs
-- ---------------------------------------------------------
ALTER TABLE `audit_logs` ADD COLUMN `ip_address` VARCHAR(45) NULL;
ALTER TABLE `audit_logs` ADD COLUMN `user_agent` TEXT NULL;

-- ---------------------------------------------------------
-- 8. Nursing notes table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `nursing_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT NOT NULL,
  `nurse_id` INT NOT NULL,
  `note_type` ENUM('vitals','medication','observation','care') DEFAULT 'observation',
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`nurse_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_nursing_note_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
