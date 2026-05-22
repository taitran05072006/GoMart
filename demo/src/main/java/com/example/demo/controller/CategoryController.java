package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.category.CategoryRequestDto;
import com.example.demo.dto.category.CategoryResponseDto;
import com.example.demo.service.CategoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*") // cho phép gọi từ frontend (JS)
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ApiResponse<CategoryResponseDto> create(@RequestBody CategoryRequestDto dto) {
        return ApiResponse.success("Danh mục đã được tạo", categoryService.create(dto));
    }

    @GetMapping
    public ApiResponse<List<CategoryResponseDto>> getAll() {
        return ApiResponse.success("Lấy danh mục thành công", categoryService.getAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<CategoryResponseDto> getById(@PathVariable Long id) {
        return ApiResponse.success("Lấy danh mục thành công", categoryService.getById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryResponseDto> update(@PathVariable Long id, @RequestBody CategoryRequestDto dto) {
        return ApiResponse.success("Danh mục đã được cập nhật", categoryService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ApiResponse.success("Danh mục đã được xóa", null);
    }
    @GetMapping("/search")
    public ApiResponse<List<CategoryResponseDto>> search(@RequestParam String keyword) {
        return ApiResponse.success("Kết quả tìm kiếm", categoryService.searchByName(keyword));
    }
    @GetMapping("/{id}/products")
    public ApiResponse<CategoryResponseDto> getCateWithProducts(@PathVariable Long id){
        return ApiResponse.success("Lấy danh mục cùng sản phẩm thành công", categoryService.getCategoryWithProducts(id));
    }
}