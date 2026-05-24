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
        int updated = productRepository.normalizeNullVersions();
        if (updated > 0) {
            log.warn("Sản phẩm có phiên bản NULL đã được chuẩn hóa thành 0: {}", updated);
        }

        int updatedProdDeleted = productRepository.normalizeNullDeleted();
        if (updatedProdDeleted > 0) {
            log.warn("Sản phẩm có is_deleted là NULL đã được chuẩn hóa thành false: {}", updatedProdDeleted);
        }

        int updatedCatDeleted = categoryRepository.normalizeNullDeleted();
        if (updatedCatDeleted > 0) {
            log.warn("Danh mục có is_deleted là NULL đã được chuẩn hóa thành false: {}", updatedCatDeleted);
        }

        int updatedCatActive = categoryRepository.normalizeNullActive();
        if (updatedCatActive > 0) {
            log.warn("Danh mục có is_active là NULL đã được chuẩn hóa thành true: {}", updatedCatActive);
        }

        int updatedRewardStars = userRepository.normalizeNullRewardStars();
        if (updatedRewardStars > 0) {
            log.warn("Người dùng có reward_stars là NULL đã được chuẩn hóa thành 0: {}", updatedRewardStars);
        }

        int updatedTiers = userRepository.normalizeNullTiers();
        if (updatedTiers > 0) {
            log.warn("Người dùng có tier là NULL đã được chuẩn hóa thành MEMBER: {}", updatedTiers);
        }
    }
}

