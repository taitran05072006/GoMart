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

    @GetMapping(params = "storeId")
    public ApiResponse<List<ProductResponseDto>> getProductsByStore(@RequestParam Long storeId, @RequestParam(required = false, defaultValue = "false") boolean includeOutOfStock) {
        return ApiResponse.success(productService.getByStoreId(storeId, includeOutOfStock));
    }

    @GetMapping("/{id:[0-9]+}")
    public ApiResponse<ProductResponseDto> getProductById(@PathVariable Long id, @RequestParam(required = false) Long storeId) {
        return ApiResponse.success(productService.getById(id, storeId));
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
    public ApiResponse<ProductResponseDto> create(@RequestBody ProductRequestDto dto,
                                                  @RequestParam(required = false) Long storeId) {
        return ApiResponse.success("Sản phẩm đã được tạo thành công", productService.create(dto, storeId));
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
    public ApiResponse<ProductResponseDto> update(@PathVariable Long id,
                                                  @RequestBody ProductRequestDto dto,
                                                  @RequestParam(required = false) Long storeId) {
        if (storeId != null) {
            return ApiResponse.success("Sản phẩm cửa hàng đã được cập nhật thành công", productService.updateForStore(id, dto, storeId));
        }
        return ApiResponse.success("Sản phẩm đã được cập nhật thành công", productService.update(id, dto));
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        productService.delete(id);
        return ApiResponse.success("Sản phẩm đã được xóa thành công", null);
    }

    @PostMapping("/{id:[0-9]+}/store/{storeId}/toggle-selling")
    public ApiResponse<ProductResponseDto> toggleSelling(@PathVariable Long id, @PathVariable Long storeId) {
        return ApiResponse.success("Đã cập nhật trạng thái bán của sản phẩm", productService.toggleSelling(id, storeId));
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