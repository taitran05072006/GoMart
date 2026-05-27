-- V1: ensure status columns are large enough and normalize legacy NULLs
-- Adjust names if your DB is not MySQL. This file assumes MySQL-compatible dialect.

ALTER TABLE orders MODIFY COLUMN status VARCHAR(50);
ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50);

-- Normalize product/version and deleted flags
UPDATE products SET version = 0 WHERE version IS NULL;
UPDATE products SET is_deleted = false WHERE is_deleted IS NULL;

-- Normalize categories
UPDATE categories SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- Normalize users
UPDATE users SET reward_stars = 0 WHERE reward_stars IS NULL;
UPDATE users SET tier = 'MEMBER' WHERE tier IS NULL;
