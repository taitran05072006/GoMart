-- V1: ensure status columns are large enough and normalize legacy NULLs
-- Adjust names if your DB is not MySQL. This file assumes MySQL-compatible dialect.

CREATE TABLE IF NOT EXISTS categories (
	id BIGINT NOT NULL AUTO_INCREMENT,
	expiry_threshold_days INT DEFAULT NULL,
	icon VARCHAR(255) DEFAULT NULL,
	is_active BIT(1) DEFAULT NULL,
	is_deleted BIT(1) DEFAULT NULL,
	name VARCHAR(255) DEFAULT NULL,
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
	id BIGINT NOT NULL AUTO_INCREMENT,
	address VARCHAR(255) DEFAULT NULL,
	avatar VARCHAR(255) DEFAULT NULL,
	created_at DATETIME(6) DEFAULT NULL,
	district VARCHAR(255) DEFAULT NULL,
	email VARCHAR(255) NOT NULL,
	house_number VARCHAR(255) DEFAULT NULL,
	name VARCHAR(255) NOT NULL,
	otp VARCHAR(255) DEFAULT NULL,
	otp_expiry DATETIME(6) DEFAULT NULL,
	password VARCHAR(255) DEFAULT NULL,
	phone VARCHAR(255) DEFAULT NULL,
	province VARCHAR(255) DEFAULT NULL,
	reward_stars INT DEFAULT 0,
	role VARCHAR(50) DEFAULT NULL,
	tier VARCHAR(255) DEFAULT 'MEMBER',
	ward VARCHAR(255) DEFAULT NULL,
	deleted TINYINT(1) NOT NULL DEFAULT 0,
	store_id BIGINT DEFAULT NULL,
	PRIMARY KEY (id),
	UNIQUE KEY UK_users_email (email)
);

CREATE TABLE IF NOT EXISTS vouchers (
	code VARCHAR(50) NOT NULL,
	discount_type VARCHAR(20) NOT NULL,
	end_date DATETIME(6) DEFAULT NULL,
	is_active BIT(1) DEFAULT NULL,
	is_deleted BIT(1) DEFAULT NULL,
	min_order_amount DOUBLE NOT NULL,
	required_tier VARCHAR(255) DEFAULT NULL,
	start_date DATETIME(6) DEFAULT NULL,
	usage_limit INT NOT NULL,
	used_count INT NOT NULL,
	value DOUBLE NOT NULL,
	voucher_type VARCHAR(255) DEFAULT NULL,
	PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS products (
	id BIGINT NOT NULL AUTO_INCREMENT,
	bg VARCHAR(255) DEFAULT NULL,
	description TEXT,
	discount INT DEFAULT NULL,
	expiry_date DATE DEFAULT NULL,
	image_url VARCHAR(255) DEFAULT NULL,
	is_deleted BIT(1) DEFAULT NULL,
	manufacture_date DATE DEFAULT NULL,
	name VARCHAR(255) DEFAULT NULL,
	new_batch_quantity INT DEFAULT NULL,
	old_batch_quantity INT DEFAULT NULL,
	old_price INT DEFAULT NULL,
	price INT DEFAULT NULL,
	rating DOUBLE DEFAULT NULL,
	reviews INT DEFAULT NULL,
	sold INT DEFAULT NULL,
	stock INT DEFAULT NULL,
	tag VARCHAR(255) DEFAULT NULL,
	unit VARCHAR(255) DEFAULT NULL,
	version BIGINT NOT NULL DEFAULT 0,
	category_id BIGINT DEFAULT NULL,
	PRIMARY KEY (id),
	KEY FK_products_category (category_id),
	CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
	id BIGINT NOT NULL AUTO_INCREMENT,
	actual_delivery_time DATETIME(6) DEFAULT NULL,
	created_at DATETIME(6) NOT NULL,
	details TEXT,
	discount DOUBLE NOT NULL DEFAULT 0,
	estimated_delivery_time DATETIME(6) DEFAULT NULL,
	final_price DOUBLE NOT NULL DEFAULT 0,
	notes TEXT,
	order_code VARCHAR(255) NOT NULL,
	payment_status VARCHAR(50) DEFAULT NULL,
	rating INT DEFAULT NULL,
	shipping_discount DOUBLE NOT NULL DEFAULT 0,
	stars_awarded INT DEFAULT NULL,
	stars_used INT DEFAULT NULL,
	status VARCHAR(50) DEFAULT NULL,
	total_price DOUBLE NOT NULL DEFAULT 0,
	shipper_id BIGINT DEFAULT NULL,
	shipping_voucher_id VARCHAR(50) DEFAULT NULL,
	user_id BIGINT NOT NULL,
	voucher_id VARCHAR(50) DEFAULT NULL,
	PRIMARY KEY (id),
	UNIQUE KEY UK_orders_order_code (order_code),
	KEY FK_orders_shipper (shipper_id),
	KEY FK_orders_shipping_voucher (shipping_voucher_id),
	KEY FK_orders_user (user_id),
	KEY FK_orders_voucher (voucher_id),
	CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
	CONSTRAINT fk_orders_shipper FOREIGN KEY (shipper_id) REFERENCES users(id),
	CONSTRAINT fk_orders_shipping_voucher FOREIGN KEY (shipping_voucher_id) REFERENCES vouchers(code),
	CONSTRAINT fk_orders_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(code)
);

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
