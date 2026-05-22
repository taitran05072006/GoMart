package com.example.demo.service;

import com.example.demo.dto.product.ProductRequestDto;
import com.example.demo.dto.product.ProductResponseDto;
import com.example.demo.dto.product.ProductUnitDto;
import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.entity.ProductUnit;
import com.example.demo.repository.ProductUnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductUnitRepository productUnitRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository, ProductUnitRepository productUnitRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productUnitRepository = productUnitRepository;
    }

    public List<ProductResponseDto> getAll(){
        return productRepository.findByIsDeletedFalse().stream()
                .map(this::mapTo)
                .collect(Collectors.toList());
    }

    public ProductResponseDto getById(Long id){
        Product product = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm!"));
        if(product.getIsDeleted()) throw new RuntimeException("Sản phẩm đã bị xóa!");
        return mapTo(product);
    }

    public List<ProductResponseDto> getByCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));
        return productRepository.findByCategory(category).stream()
                .map(this::mapTo)
                .collect(Collectors.toList());
    }

    public ProductResponseDto create(ProductRequestDto dto){
        Category category = categoryRepository.findById(dto.getCategoryId()).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục của sản phẩm"));

        Product product = Product.builder()
                .name(dto.getName())
                .imageUrl(dto.getImageUrl())
                .bg(dto.getBg())
                .price(dto.getPrice())
                .oldPrice(dto.getOldPrice())
                .discount(dto.getDiscount())
                .rating(dto.getRating())
                .reviews(dto.getReviews())
                .tag(dto.getTag())
                .unit(dto.getUnit())
                .stock(dto.getStock())
                .sold(0)
                .oldBatchQuantity(dto.getOldBatchQuantity())
                .newBatchQuantity(dto.getNewBatchQuantity())
                .manufactureDate(dto.getManufactureDate())
                .expiryDate(dto.getExpiryDate())
                .description(dto.getDescription())
                .category(category)
                .build();
        productRepository.save(product);

        // Lưu đơn vị quy đổi
        if (dto.getUnits() != null) {
            List<ProductUnit> units = dto.getUnits().stream()
                    .map(u -> ProductUnit.builder()
                            .name(u.getName())
                            .conversionRate(u.getConversionRate())
                            .price(u.getPrice() != null ? u.getPrice().intValue() : null)
                            .oldPrice(u.getOldPrice() != null ? u.getOldPrice().intValue() : null)
                            .product(product)
                            .build())
                    .toList();
            productUnitRepository.saveAll(units);
        }

        return mapTo(product);
    }

    public List<ProductResponseDto> searchAll(
            String keyword,
            Long categoryId,
            Double minPrice,
            Double maxPrice
    ) {
        return productRepository.searchAll(
                keyword,
                categoryId,
                minPrice,
                maxPrice
        ).stream().map(this::mapTo).toList();
    }

    // ================= UPDATE =================
    public ProductResponseDto update(Long id, ProductRequestDto dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục của sản phẩm"));

        product.setName(dto.getName());
        product.setImageUrl(dto.getImageUrl());
        product.setBg(dto.getBg());
        product.setPrice(dto.getPrice());
        product.setOldPrice(dto.getOldPrice());
        product.setDiscount(dto.getDiscount());
        product.setRating(dto.getRating());
        product.setReviews(dto.getReviews());
        product.setTag(dto.getTag());
        product.setUnit(dto.getUnit());
        product.setStock(dto.getStock());
        product.setOldBatchQuantity(dto.getOldBatchQuantity());
        product.setNewBatchQuantity(dto.getNewBatchQuantity());
        product.setManufactureDate(dto.getManufactureDate());
        product.setExpiryDate(dto.getExpiryDate());
        product.setDescription(dto.getDescription());
        product.setCategory(category);

        productRepository.save(product);

        // Cập nhật đơn vị quy đổi (Xóa cũ - Thêm mới)
        productUnitRepository.deleteByProductId(product.getId());
        if (dto.getUnits() != null) {
            List<ProductUnit> units = dto.getUnits().stream()
                    .map(u -> ProductUnit.builder()
                            .name(u.getName())
                            .conversionRate(u.getConversionRate())
                            .price(u.getPrice() != null ? u.getPrice().intValue() : null)
                            .oldPrice(u.getOldPrice() != null ? u.getOldPrice().intValue() : null)
                            .product(product)
                            .build())
                    .toList();
            productUnitRepository.saveAll(units);
        }

        return mapTo(product);
    }

    // ================= DELETE =================
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        product.setIsDeleted(true);
        productRepository.save(product);
    }
    public List<ProductResponseDto> filterProducts(
            Long categoryId,
            Double minPrice,
            Double maxPrice,
            String sortBy,
            String sortDir
    ) {
        List<Product> products;

        // ===== FILTER =====
        if (categoryId != null && minPrice != null && maxPrice != null) {
            products = productRepository.findByCategoryIdAndPriceBetweenAndIsDeletedFalse(
                    categoryId, minPrice, maxPrice);

        } else if (categoryId != null) {
            products = productRepository.findByCategoryIdAndIsDeletedFalse(categoryId);

        } else if (minPrice != null && maxPrice != null) {
            products = productRepository.findByPriceBetweenAndIsDeletedFalse(minPrice, maxPrice);

        } else {
            products = productRepository.findByIsDeletedFalse();
        }

        // ===== SORT =====
        if (sortBy != null) {
            Comparator<Product> comparator;

            switch (sortBy) {
                case "price":
                    comparator = Comparator.comparing(Product::getPrice);
                    break;

                case "name":
                    comparator = Comparator.comparing(Product::getName);
                    break;

                case "rating":
                    comparator = Comparator.comparing(Product::getRating);
                    break;

                default:
                    comparator = Comparator.comparing(Product::getId);
            }

            // sort desc
            if ("desc".equals(sortDir)) {
                comparator = comparator.reversed();
            }

            products.sort(comparator);
        }

        // ===== RETURN =====
        return products.stream()
                .map(this::mapTo)
                .collect(Collectors.toList());
    }

    public List<ProductResponseDto> getLowStockProducts(Integer threshold) {
        return productRepository.findByStockLessThanAndIsDeletedFalse(threshold).stream()
                .map(this::mapTo)
                .toList();
    }

    public List<ProductResponseDto> getExpiringSoonProducts() {
        return productRepository.findByExpiryDateBeforeAndIsDeletedFalse().stream()
                .map(this::mapTo)
                .toList();
    }

    private ProductResponseDto mapTo(Product product) {
        List<ProductUnitDto> units = productUnitRepository.findByProductId(product.getId())
                .stream()
                .map(u -> ProductUnitDto.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .conversionRate(u.getConversionRate())
                        .price(u.getPrice() != null ? u.getPrice().doubleValue() : 0.0)
                        .oldPrice(u.getOldPrice() != null ? u.getOldPrice().doubleValue() : 0.0)
                        .build())
                .toList();

        double discountPercent = product.getDiscount() != null ? product.getDiscount() : 0.0;
        units.forEach(u -> {
            double originalPrice = u.getPrice() != null ? u.getPrice() : 0.0;
            u.setOldPrice(originalPrice);
            u.setPrice(originalPrice * (1 - discountPercent / 100.0));
        });
        return ProductResponseDto.builder()
                .id(product.getId())
                .name(product.getName())
                .imageUrl(product.getImageUrl())
                .bg(product.getBg())
                .price(product.getPrice())
                .oldPrice(product.getOldPrice())
                .discount(product.getDiscount())
                .rating(product.getRating())
                .reviews(product.getReviews())
                .tag(product.getTag())
                .unit(product.getUnit())
                .stock(product.getStock())
                .sold(product.getSold())
                .oldBatchQuantity(product.getOldBatchQuantity())
                .newBatchQuantity(product.getNewBatchQuantity())
                .manufactureDate(product.getManufactureDate())
                .expiryDate(product.getExpiryDate())
                .description(product.getDescription())
                .category(product.getCategory().getName())
                .categoryId(product.getCategory().getId())
                .units(units)
                .build();
    }
}