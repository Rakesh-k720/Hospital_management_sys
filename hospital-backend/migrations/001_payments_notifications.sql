-- Run once on existing hospital_db (ignore errors if columns already exist)
ALTER TABLE `bills` ADD COLUMN `razorpay_order_id` VARCHAR(100) NULL;
ALTER TABLE `bills` ADD COLUMN `razorpay_payment_id` VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `channel` ENUM('sms', 'whatsapp', 'console') NOT NULL,
  `phone` VARCHAR(20) NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('sent', 'failed', 'simulated') DEFAULT 'simulated',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
