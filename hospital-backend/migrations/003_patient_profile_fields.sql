-- Patient profile: allergies & medical notes
ALTER TABLE `patients`
  ADD COLUMN `allergies` TEXT NULL AFTER `emergency_contact`,
  ADD COLUMN `medical_notes` TEXT NULL AFTER `allergies`;
