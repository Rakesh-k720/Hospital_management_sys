-- Hospital Management System (HMS) Database Schema
-- Database Engine: InnoDB
-- Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- 1. Users & Auth
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'doctor', 'patient') NOT NULL,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_email` (`email`),
    INDEX `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 2. Departments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 3. Doctors
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `specialization` VARCHAR(100) NOT NULL,
    `experience_years` INT DEFAULT 0,
    `room_number` VARCHAR(20),
    `consultation_fee` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    INDEX `idx_doc_user` (`user_id`),
    INDEX `idx_doc_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 4. Patients
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `age` INT NOT NULL,
    `gender` ENUM('male', 'female', 'other') NOT NULL,
    `blood_group` VARCHAR(5),
    `address` TEXT,
    `emergency_contact` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_patient_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 5. Appointments
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME NOT NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    `remarks` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    INDEX `idx_appt_date` (`appointment_date`),
    INDEX `idx_appt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 6. OPD Tokens / Queue Management
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `opd_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `token_number` VARCHAR(20) NOT NULL,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `visit_date` DATE NOT NULL,
    `status` ENUM('waiting', 'in_consultation', 'completed') DEFAULT 'waiting',
    `priority` ENUM('normal', 'emergency') DEFAULT 'normal',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    INDEX `idx_opd_token` (`token_number`),
    INDEX `idx_opd_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 7. Beds Management
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `beds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ward_name` VARCHAR(100) NOT NULL,
    `bed_number` VARCHAR(20) NOT NULL,
    `bed_type` ENUM('general', 'ICU', 'private') NOT NULL,
    `status` ENUM('available', 'occupied', 'cleaning') DEFAULT 'available',
    INDEX `idx_bed_status` (`status`),
    UNIQUE KEY `unique_bed` (`ward_name`, `bed_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 8. IPD Admissions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `bed_id` INT NOT NULL,
    `admission_date` DATETIME NOT NULL,
    `discharge_date` DATETIME,
    `diagnosis` TEXT,
    `status` ENUM('admitted', 'discharged') DEFAULT 'admitted',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE RESTRICT,
    INDEX `idx_adm_patient` (`patient_id`),
    INDEX `idx_adm_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 9. Prescriptions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 10. Prescription Medicines
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescription_medicines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `prescription_id` INT NOT NULL,
    `medicine_name` VARCHAR(255) NOT NULL,
    `dosage` VARCHAR(100) NOT NULL,
    `duration` VARCHAR(100) NOT NULL,
    `instructions` TEXT,
    FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 11. Laboratory
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lab_tests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `test_name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `price` DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lab_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `test_id` INT NOT NULL,
    `report_file` VARCHAR(255),
    `result_notes` TEXT,
    `status` ENUM('pending', 'completed') DEFAULT 'pending',
    `report_date` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`test_id`) REFERENCES `lab_tests`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- 12. Billing
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `payment_status` ENUM('unpaid', 'paid', 'partially_paid') DEFAULT 'unpaid',
    `payment_method` ENUM('cash', 'card', 'insurance', 'online'),
    `bill_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    INDEX `idx_bill_patient` (`patient_id`),
    INDEX `idx_bill_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bill_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bill_id` INT NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,
    `quantity` INT DEFAULT 1,
    FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- Sample Data (Optional Seed)
-- ---------------------------------------------------------

-- 1. Departments
INSERT INTO `departments` (`name`, `description`) VALUES 
('Cardiology', 'Heart related disorders'),
('Neurology', 'Nervous system disorders'),
('Pediatrics', 'Child healthcare'),
('General Medicine', 'General health issues');

-- 2. Sample Admin/Doctor Users
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`) VALUES 
('Admin User', 'admin@hospital.com', '1234567890', 'hash_pass_admin', 'admin'),
('Dr. Smith', 'smith@hospital.com', '1234567891', 'hash_pass_smith', 'doctor');

-- 3. Doctor Details
INSERT INTO `doctors` (`user_id`, `department_id`, `specialization`, `experience_years`, `room_number`, `consultation_fee`) VALUES 
(2, 1, 'Cardiologist', 12, '101A', 500.00);

-- 4. Sample Patient
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`) VALUES 
('Rakesh Kumar', 'rakesh@gmail.com', '9876543210', 'hash_pass_john', 'patient');
INSERT INTO `patients` (`user_id`, `age`, `gender`, `blood_group`, `address`) VALUES 
(3, 20, 'male', 'A+', 'Street 1, NY');
