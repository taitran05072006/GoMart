package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.voucher.VoucherRequestDto;
import com.example.demo.dto.voucher.VoucherResponseDto;
import com.example.demo.service.VoucherService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@CrossOrigin(origins = "*")
public class VoucherController {

    private final VoucherService voucherService;

    public VoucherController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    @GetMapping
    public ApiResponse<List<VoucherResponseDto>> getAll() {
        return ApiResponse.success(voucherService.getAll());
    }

    @GetMapping("/{code}")
    public ApiResponse<VoucherResponseDto> getByCode(@PathVariable String code) {
        return ApiResponse.success(voucherService.getByCode(code));
    }

    @PostMapping
    public ApiResponse<VoucherResponseDto> create(@RequestBody VoucherRequestDto request) {
        return ApiResponse.success("Mã giảm giá đã được tạo thành công", voucherService.create(request));
    }

    @PutMapping("/{code}")
    public ApiResponse<VoucherResponseDto> update(@PathVariable String code, @RequestBody VoucherRequestDto request) {
        return ApiResponse.success("Mã giảm giá đã được cập nhật thành công", voucherService.update(code, request));
    }

    @DeleteMapping("/{code}")
    public ApiResponse<String> delete(@PathVariable String code) {
        voucherService.delete(code);
        return ApiResponse.success("Mã giảm giá đã được xóa thành công", null);
    }

    @PatchMapping("/{code}/active")
    public ApiResponse<VoucherResponseDto> toggleActive(@PathVariable String code, @RequestParam boolean active) {
        return ApiResponse.success("Trạng thái mã giảm giá đã được cập nhật", voucherService.toggleActive(code, active));
    }

    @GetMapping("/validate")
    public ApiResponse<VoucherResponseDto> validateVoucher(
            @RequestParam String code,
            @RequestParam Double subtotal,
            @RequestParam(required = false) Long userId) {
        return ApiResponse.success("Mã giảm giá đã được áp dụng thành công", voucherService.validateVoucher(userId, code, subtotal));
    }

    @GetMapping("/checkout")
    public ApiResponse<List<VoucherResponseDto>> getForCheckout(
            @RequestParam Long userId,
            @RequestParam Double subtotal,
            @RequestParam(required = false) List<Long> productIds) {
        return ApiResponse.success(voucherService.getVouchersForCheckout(userId, subtotal, productIds));
    }

    @GetMapping("/available")
    public ApiResponse<List<VoucherResponseDto>> getAvailable(@RequestParam Long userId) {
        return ApiResponse.success(voucherService.getAvailableVouchers(userId));
    }

    @GetMapping("/my-vouchers")
    public ApiResponse<List<VoucherResponseDto>> getMyVouchers(@RequestParam Long userId) {
        return ApiResponse.success(voucherService.getMyVouchers(userId));
    }

    @PostMapping("/collect")
    public ApiResponse<VoucherResponseDto> collect(
            @RequestParam Long userId,
            @RequestParam String code) {
        return ApiResponse.success("Thu thập mã giảm giá thành công", voucherService.collectVoucher(userId, code));
    }
}
