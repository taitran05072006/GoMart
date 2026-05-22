package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.supplier.SupplierRequestDto;
import com.example.demo.dto.supplier.SupplierResponseDto;
import com.example.demo.service.SupplierService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "*")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @PostMapping
    public ApiResponse<SupplierResponseDto> create(@RequestBody SupplierRequestDto dto) {
        return ApiResponse.success("Nhà cung cấp đã được tạo", supplierService.create(dto));
    }

    @GetMapping
    public ApiResponse<List<SupplierResponseDto>> getAll() {
        return ApiResponse.success("Lấy danh sách nhà cung cấp thành công", supplierService.getAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<SupplierResponseDto> getById(@PathVariable Long id) {
        return ApiResponse.success("Lấy nhà cung cấp thành công", supplierService.getById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<SupplierResponseDto> update(@PathVariable Long id, @RequestBody SupplierRequestDto dto) {
        return ApiResponse.success("Nhà cung cấp đã được cập nhật", supplierService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ApiResponse.success("Nhà cung cấp đã được xóa", null);
    }
}
