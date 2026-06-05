package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.entity.ImportUnit;
import com.example.demo.repository.ImportUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/import-units")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ImportUnitController {

    private final ImportUnitRepository repository;

    @GetMapping
    public ApiResponse<List<ImportUnit>> getByProduct(@RequestParam(required = false) Long productId) {
        if (productId != null) {
            return ApiResponse.success("Lấy đơn vị nhập theo product thành công", repository.findByProductId(productId));
        }
        return ApiResponse.success("Lấy tất cả đơn vị nhập thành công", repository.findAll());
    }

    @PostMapping
    public ApiResponse<ImportUnit> create(@RequestBody ImportUnit unit) {
        return ApiResponse.success("Tạo import unit thành công", repository.save(unit));
    }

    @PutMapping("/{id}")
    public ApiResponse<ImportUnit> update(@PathVariable Long id, @RequestBody ImportUnit unit) {
        unit.setId(id);
        return ApiResponse.success("Cập nhật import unit thành công", repository.save(unit));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ApiResponse.success("Xóa import unit thành công", null);
    }
}
