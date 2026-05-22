package com.example.demo.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixOrderTableSchema() {
        log.info("Khởi tạo tiến trình cập nhật độ dài cột trong database...");
        try {
            // Force update column length for status to handle RETURN_REQUESTED and other long status names
            jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN status VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50)");
            log.info("Cập nhật Database thành công: Cột status và payment_status đã được nâng cấp lên VARCHAR(50)");
        } catch (Exception e) {
            log.warn("Thông báo: Cột Database đã được cập nhật trước đó hoặc có lỗi nhỏ không đáng kể: {}", e.getMessage());
        }
    }
}
