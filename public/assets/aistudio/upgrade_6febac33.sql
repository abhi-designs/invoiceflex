-- ============================================================
-- Invoice Flex — database upgrade
--
-- config.php applies all of this by itself the first time a page
-- loads, so running this file is optional. It is here so the
-- schema change is visible for your project report, and so you
-- can apply it by hand in phpMyAdmin if you prefer.
--
-- Nothing is dropped. Existing users, customers, invoices and
-- items stay exactly as they are.
-- ============================================================

USE `invoice_db`;

-- 1. Payment records. One invoice can have several entries, which
--    is how a 50% advance followed by a balance payment is stored.
CREATE TABLE IF NOT EXISTS `payments` (
  `id`          INT(11) NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) NOT NULL,
  `invoice_id`  INT(11) NOT NULL,
  `customer_id` INT(11) DEFAULT NULL,
  `amount`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_on`     DATE NOT NULL,
  `method`      VARCHAR(30) DEFAULT 'Cash',
  `note`        VARCHAR(255) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Round profile picture, kept separate from the invoice logo.
ALTER TABLE `company` ADD COLUMN IF NOT EXISTS `profile_image` VARCHAR(255) DEFAULT NULL;

-- 3. Home state of the seller, used to decide CGST+SGST or IGST.
ALTER TABLE `company` ADD COLUMN IF NOT EXISTS `state` VARCHAR(100) DEFAULT NULL;
UPDATE `company` SET `state` = 'Gujarat' WHERE `state` IS NULL OR `state` = '';

-- 4. Payment terms printed on the bill.
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `payment_terms` VARCHAR(120) DEFAULT NULL;

-- 4a. City, alongside state/state code, for the company and for
--     every customer.
ALTER TABLE `company`   ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) DEFAULT NULL;

-- 4b. Tracks whether a user has already been through the Spotify-style
--     plan picker shown once right after setup.
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `plan_chosen` TINYINT(1) NOT NULL DEFAULT 0;

-- 5. Membership status is now worked out from the end date, so put
--    the stored column back in step with the dates once.
UPDATE `users`
   SET `membership_status` = 'expired'
 WHERE `is_admin` = 0
   AND `membership_expiry` IS NOT NULL
   AND `membership_expiry` <> '0000-00-00'
   AND `membership_expiry` < CURDATE();

UPDATE `users`
   SET `membership_status` = 'active'
 WHERE `is_admin` = 0
   AND (`membership_expiry` IS NULL
        OR `membership_expiry` = '0000-00-00'
        OR `membership_expiry` >= CURDATE());
