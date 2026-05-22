package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.product.ProductRequestDto;
import com.example.demo.dto.product.ProductResponseDto;
import com.example.demo.service.ProductService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }
    @GetMapping
    public ApiResponse<List<ProductResponseDto>> getAllProducts() {
        return ApiResponse.success( productService.getAll());
    }

    @GetMapping("/{id:[0-9]+}")
    public ApiResponse<ProductResponseDto> getProductById(@PathVariable Long id) {
        return ApiResponse.success(productService.getById(id));
    }

    @GetMapping("/low-stock")
    public ApiResponse<List<ProductResponseDto>> getLowStockProducts(@RequestParam(defaultValue = "10") Integer threshold) {
        return ApiResponse.success(productService.getLowStockProducts(threshold));
    }

    @GetMapping("/expiring-soon")
    public ApiResponse<List<ProductResponseDto>> getExpiringSoonProducts() {
        return ApiResponse.success(productService.getExpiringSoonProducts());
    }

    @PostMapping
    public ApiResponse<ProductResponseDto> create(@RequestBody ProductRequestDto dto) {
        return ApiResponse.success("Sản phẩm đã được tạo thành công", productService.create(dto));
    }

    @GetMapping("/category/{categoryId}")
    public ApiResponse<List<ProductResponseDto>> getByCategory(@PathVariable Long categoryId){
        return ApiResponse.success("Lấy sản phẩm theo danh mục thành công", productService.getByCategory(categoryId));
    }

    @GetMapping("/search")
    public ApiResponse<List<ProductResponseDto>> searchAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        return ApiResponse.success(
                productService.searchAll(keyword, categoryId, minPrice, maxPrice)
        );
    }

    @PutMapping("/{id:[0-9]+}")
    public ApiResponse<ProductResponseDto> update(@PathVariable Long id, @RequestBody ProductRequestDto dto) {
        return ApiResponse.success("Sản phẩm đã được cập nhật thành công", productService.update(id, dto));
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        productService.delete(id);
        return ApiResponse.success("Sản phẩm đã được xóa thành công", null);
    }
    @GetMapping("/filter")
    public ApiResponse<List<ProductResponseDto>> filterProducts(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ){
        return ApiResponse.success(productService.filterProducts(
                categoryId, minPrice, maxPrice, sortBy, sortDir
        ));
    }
}