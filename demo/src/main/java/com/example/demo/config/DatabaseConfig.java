package com.example.demo.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@ConditionalOnProperty(name = "app.database-config.enabled", havingValue = "true", matchIfMissing = false)
@RequiredArgsConstructor
@Slf4j
public class DatabaseConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixOrderTableSchema() {
        log.info("Khởi tạo tiến trình cập nhật độ dài cột trong database...");
        try {
            // Only alter columns if current max length is smaller than desired.
            // This makes the startup idempotent and safer for production.
            try {
                Integer statusLen = jdbcTemplate.queryForObject(
                        "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'status' AND TABLE_SCHEMA = DATABASE()",
                        Integer.class);
                if (statusLen == null || statusLen < 50) {
                    jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN status VARCHAR(50)");
                    log.info("Đã cập nhật cột 'status' lên VARCHAR(50)");
                } else {
                    log.debug("Không cần thay đổi cột 'status' (length={})", statusLen);
                }
            } catch (Exception e) {
                log.warn("Không thể kiểm tra/ cập nhật cột 'status': {}", e.getMessage());
            }

            try {
                Integer payStatusLen = jdbcTemplate.queryForObject(
                        "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_status' AND TABLE_SCHEMA = DATABASE()",
                        Integer.class);
                if (payStatusLen == null || payStatusLen < 50) {
                    jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50)");
                    log.info("Đã cập nhật cột 'payment_status' lên VARCHAR(50)");
                } else {
                    log.debug("Không cần thay đổi cột 'payment_status' (length={})", payStatusLen);
                }
            } catch (Exception e) {
                log.warn("Không thể kiểm tra/ cập nhật cột 'payment_status': {}", e.getMessage());
            }

            log.info("Kiểm tra schema hoàn tất");
        } catch (Exception e) {
            log.warn("Thông báo: Cột Database đã được cập nhật trước đó hoặc có lỗi nhỏ không đáng kể: {}", e.getMessage());
        }
    }
}
