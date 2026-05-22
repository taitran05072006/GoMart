package com.example.demo.config;

import com.example.demo.repository.ProductRepository;
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

    @Override
    public void run(ApplicationArguments args) {
        int updated = productRepository.normalizeNullVersions();
        if (updated > 0) {
            log.warn("Sản phẩm có phiên bản NULL đã được chuẩn hóa thành 0: {}", updated);
        }
    }
}

