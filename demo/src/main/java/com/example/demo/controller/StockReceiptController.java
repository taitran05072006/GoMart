package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.stock.StockReceiptRequestDto;
import com.example.demo.dto.stock.StockReceiptResponseDto;
import com.example.demo.service.StockReceiptService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import com.example.demo.repository.UserRepository;
import com.example.demo.entity.User;
import com.example.demo.entity.Role;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/admin/stock-receipts")

public class StockReceiptController {
    private final StockReceiptService service;
    private final UserRepository userRepository;
    public StockReceiptController(StockReceiptService service, UserRepository userRepository){
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<StockReceiptResponseDto>> getAll(
            @RequestHeader(value = "X-User-Id", required = false) String uid,
            @RequestHeader(value = "X-Impersonate-Store-Id", required = false) String impersonateStoreId
    ) {
        List<StockReceiptResponseDto> all = service.getAll();
        if (uid != null) {
            try {
                User u = userRepository.findById(Long.parseLong(uid)).orElse(null);
                if (u != null) {
                    if (u.getRole() == Role.STORE_ADMIN) {
                        all = all.stream().filter(r -> r.getStoreId() != null && r.getStoreId().equals(u.getStore().getId())).collect(Collectors.toList());
                    } else if (u.getRole() == Role.SUPER_ADMIN && impersonateStoreId != null && !impersonateStoreId.isEmpty()) {
                        Long sId = Long.parseLong(impersonateStoreId);
                        all = all.stream().filter(r -> r.getStoreId() != null && r.getStoreId().equals(sId)).collect(Collectors.toList());
                    }
                }
            } catch(Exception ignored) {}
        }
        return ApiResponse.success(all);
    }
    @GetMapping("/{id:[0-9]+}")
    public ApiResponse<StockReceiptResponseDto> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }
    @PostMapping
    public ApiResponse<StockReceiptResponseDto> create(
            @RequestBody StockReceiptRequestDto request, 
            @RequestHeader(value = "X-User-Id", required = false) String uid,
            @RequestHeader(value = "X-Impersonate-Store-Id", required = false) String impersonateStoreId
    ){
        if (uid != null) {
            try {
                User u = userRepository.findById(Long.parseLong(uid)).orElse(null);
                if (u != null) {
                    if (u.getRole() == Role.STORE_ADMIN && u.getStore() != null) {
                        request.setStoreId(u.getStore().getId());
                    } else if (u.getRole() == Role.SUPER_ADMIN && impersonateStoreId != null && !impersonateStoreId.isEmpty()) {
                        request.setStoreId(Long.parseLong(impersonateStoreId));
                    }
                }
            } catch(Exception ignored) {}
        }
        return ApiResponse.success( service.createReceipt(request));
    }
    
    @PutMapping("/{id}/status")
    public ApiResponse<StockReceiptResponseDto> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            User u = userRepository.findById(Long.parseLong(uid)).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) {
                return ApiResponse.error("Chỉ SUPER_ADMIN mới có quyền duyệt phiếu nhập");
            }
            String status = body.get("status");
            return ApiResponse.success(service.approveReceipt(id, status));
        } catch (Exception ex) {
            return ApiResponse.error("Lỗi: " + ex.getMessage());
        }
    }
}
