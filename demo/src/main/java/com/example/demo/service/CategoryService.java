package com.example.demo.service;

import com.example.demo.dto.category.CategoryRequestDto;
import com.example.demo.dto.category.CategoryResponseDto;
import com.example.demo.dto.product.ProductResponseDto;
import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;


@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    public final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository){
        this.productRepository =productRepository;
        this.categoryRepository = categoryRepository;
    }
    
    private CategoryResponseDto mapToDto(Category category) {
        long count = productRepository.countByCategoryIdAndIsDeletedFalse(category.getId());
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .productCount((int) count)
                .expiryThresholdDays(category.getExpiryThresholdDays() != null ? category.getExpiryThresholdDays() : 0)
                .build();
    }

    public CategoryResponseDto create(CategoryRequestDto dto) {
        Category category = Category.builder()
                .name(dto.getName())
                .icon(dto.getIcon())
                .expiryThresholdDays(dto.getExpiryThresholdDays())
                .isDeleted(false)
                .isActive(true)
                .build();
        categoryRepository.save(category);
        return mapToDto(category);
    }

    public List<CategoryResponseDto> getAll(){
        return categoryRepository.findByIsDeletedFalse().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<CategoryResponseDto> getByStoreId(Long storeId) {
        return categoryRepository.findByStoreId(storeId).stream().map(this::mapToDto).collect(Collectors.toList());
    }

  public CategoryResponseDto getById(Long id){
        Category category = categoryRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tồn tại danh mục"));
        return mapToDto(category);
  }
    public CategoryResponseDto update(Long id, CategoryRequestDto dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));

        category.setName(dto.getName());
        category.setIcon(dto.getIcon());
        category.setExpiryThresholdDays(dto.getExpiryThresholdDays());

        categoryRepository.save(category);
        return mapToDto(category);
    }

    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục để xóa"));

        long activeProductsCount = productRepository.countByCategoryIdAndIsDeletedFalse(id);
        if (activeProductsCount > 0) {
            throw new RuntimeException("Không thể xóa! Danh mục này đang chứa " + activeProductsCount + " sản phẩm.");
        }

        category.setIsDeleted(true);
        categoryRepository.save(category);
    }

    public List<CategoryResponseDto> searchByName(String keyword){
        List<Category> category = categoryRepository.findByNameContainingIgnoreCaseAndIsDeletedFalse(keyword);
        if(category.isEmpty()) throw new RuntimeException("Không tìm thấy danh mục nào!");
        return category.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public CategoryResponseDto getCategoryWithProducts(Long categoryId){

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));

        List<Product> products = productRepository.findByCategoryIdAndIsDeletedFalse(categoryId);

        List<ProductResponseDto> productDtos = products.stream()
                .map(product -> ProductResponseDto.builder()
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
                        .description(product.getDescription())
                        .category(product.getCategory().getName())
                        .build()
                )
                .toList();

        CategoryResponseDto categoryResponseDto = new CategoryResponseDto();
        categoryResponseDto.setId(category.getId());
        categoryResponseDto.setName(category.getName());
        categoryResponseDto.setProducts(productDtos);

        return categoryResponseDto;
    }
}
