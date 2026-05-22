package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.entity.ShippingFee;
import com.example.demo.repository.ShippingFeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShippingLocationController {

    private final ShippingFeeRepository repository;

    @GetMapping
    public ApiResponse<List<ShippingFee>> getAll() {
        return ApiResponse.success("Lấy danh sách phí vận chuyển thành công", repository.findAll());
    }

    @PostMapping
    public ApiResponse<ShippingFee> create(@RequestBody ShippingFee fee) {
        return ApiResponse.success("Thêm phí vận chuyển thành công", repository.save(fee));
    }

    @PutMapping("/{id}")
    public ApiResponse<ShippingFee> update(@PathVariable Long id, @RequestBody ShippingFee fee) {
        fee.setId(id);
        return ApiResponse.success("Cập nhật phí vận chuyển thành công", repository.save(fee));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ApiResponse.success("Xóa phí vận chuyển thành công", null);
    }
}
