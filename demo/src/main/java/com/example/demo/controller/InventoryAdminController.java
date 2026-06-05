package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.inventory.InventoryHistoryResponseDto;
import com.example.demo.dto.inventory.InventorySummaryResponseDto;
import com.example.demo.dto.inventory.InventoryTransferRequestDto;
import com.example.demo.dto.inventory.InventoryTransferResponseDto;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.InventoryAdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/admin/inventory")
public class InventoryAdminController {
    private final InventoryAdminService service;
    private final UserRepository userRepository;

    public InventoryAdminController(InventoryAdminService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping("/summary")
    public ApiResponse<InventorySummaryResponseDto> getSummary(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestHeader(value = "X-User-Id", required = false) String uid
    ) {
        if (!isSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        return ApiResponse.success(service.getSummary(storeId));
    }

    @GetMapping("/history")
    public ApiResponse<List<InventoryHistoryResponseDto>> getHistory(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestHeader(value = "X-User-Id", required = false) String uid
    ) {
        if (!isSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        return ApiResponse.success(service.getHistory(storeId));
    }

    @PostMapping("/transfers")
    public ApiResponse<InventoryTransferResponseDto> transferStock(
            @RequestBody InventoryTransferRequestDto request,
            @RequestHeader(value = "X-User-Id", required = false) String uid
    ) {
        if (!isSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        try {
            Long requesterId = Long.parseLong(uid);
            return ApiResponse.success(service.transferStock(request, requesterId));
        } catch (Exception ex) {
            return ApiResponse.error(ex.getMessage());
        }
    }

    private boolean isSuperAdmin(String uid) {
        if (uid == null) return false;
        try {
            Long id = Long.parseLong(uid);
            User user = userRepository.findById(id).orElse(null);
            return user != null && user.getRole() == Role.SUPER_ADMIN;
        } catch (Exception ex) {
            return false;
        }
    }
}