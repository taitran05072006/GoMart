package com.example.demo.config;

import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductVersionNormalizer implements ApplicationRunner {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Override
    public void run(ApplicationArguments args) {
        // Only run normalization statements when there are matching NULL values.
        try {
            long nullVersions = productRepository.countNullVersions();
            if (nullVersions > 0) {
                int updated = productRepository.normalizeNullVersions();
                log.warn("Sản phẩm có phiên bản NULL đã được chuẩn hóa thành 0: {}", updated);
            } else {
                log.debug("Không tìm thấy sản phẩm có phiên bản NULL");
            }

            long nullProdDeleted = productRepository.countNullDeleted();
            if (nullProdDeleted > 0) {
                int updatedProdDeleted = productRepository.normalizeNullDeleted();
                log.warn("Sản phẩm có is_deleted là NULL đã được chuẩn hóa thành false: {}", updatedProdDeleted);
            } else {
                log.debug("Không tìm thấy sản phẩm có is_deleted NULL");
            }

            long nullCatDeleted = categoryRepository.countNullDeleted();
            if (nullCatDeleted > 0) {
                int updatedCatDeleted = categoryRepository.normalizeNullDeleted();
                log.warn("Danh mục có is_deleted là NULL đã được chuẩn hóa thành false: {}", updatedCatDeleted);
            } else {
                log.debug("Không tìm thấy danh mục có is_deleted NULL");
            }

            long nullCatActive = categoryRepository.countNullActive();
            if (nullCatActive > 0) {
                int updatedCatActive = categoryRepository.normalizeNullActive();
                log.warn("Danh mục có is_active là NULL đã được chuẩn hóa thành true: {}", updatedCatActive);
            } else {
                log.debug("Không tìm thấy danh mục có is_active NULL");
            }

            long nullRewardStars = userRepository.countNullRewardStars();
            if (nullRewardStars > 0) {
                int updatedRewardStars = userRepository.normalizeNullRewardStars();
                log.warn("Người dùng có reward_stars là NULL đã được chuẩn hóa thành 0: {}", updatedRewardStars);
            } else {
                log.debug("Không tìm thấy người dùng có reward_stars NULL");
            }

            long nullTiers = userRepository.countNullTiers();
            if (nullTiers > 0) {
                int updatedTiers = userRepository.normalizeNullTiers();
                log.warn("Người dùng có tier là NULL đã được chuẩn hóa thành MEMBER: {}", updatedTiers);
            } else {
                log.debug("Không tìm thấy người dùng có tier NULL");
            }
        } catch (Exception e) {
            log.warn("Lỗi khi chuẩn hóa dữ liệu khởi động: {}", e.getMessage());
        }
    }
}

