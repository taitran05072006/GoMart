package com.example.demo.task;

import com.example.demo.entity.Product;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductExpiryTask {

    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    // Chạy vào 7h sáng mỗi ngày
    @Scheduled(cron = "0 0 7 * * *")
    public void checkProductExpiry() {
        log.info("Bắt đầu kiểm tra hạn sử dụng sản phẩm...");
        
        List<Product> products = productRepository.findAll();
        LocalDate today = LocalDate.now();
        
        for (Product product : products) {
            if (product.getExpiryDate() == null || product.getIsDeleted()) {
                continue;
            }
            
            long daysUntilExpiry = ChronoUnit.DAYS.between(today, product.getExpiryDate());
            
            // Cảnh báo nếu còn dưới 30 ngày và trên 0 ngày (chưa hết hạn)
            // Hoặc cảnh báo đúng vào ngày hết hạn
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
                notificationService.sendExpiryWarningNotification(product, daysUntilExpiry);
            }
        }
        
        log.info("Hoàn tất kiểm tra hạn sử dụng sản phẩm.");
    }
}
