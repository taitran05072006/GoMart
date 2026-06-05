package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.product.ProductResponseDto;
import com.example.demo.entity.Region;
import com.example.demo.entity.Store;
import com.example.demo.service.ProductService;
import com.example.demo.repository.UserRepository;
import com.example.demo.entity.User;
import com.example.demo.entity.Role;
import com.example.demo.repository.RegionRepository;
import com.example.demo.repository.StoreRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@CrossOrigin(origins = "*")
public class StoreController {
    private final StoreRepository storeRepository;
    private final RegionRepository regionRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    public StoreController(StoreRepository storeRepository, RegionRepository regionRepository, UserRepository userRepository, ProductService productService) {
        this.storeRepository = storeRepository;
        this.regionRepository = regionRepository;
        this.userRepository = userRepository;
        this.productService = productService;
    }

    @GetMapping
    public ApiResponse<List<Store>> listStores(
            @RequestParam(required = false) String regionName,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted
    ) {
        if (includeDeleted) {
            return ApiResponse.success(storeRepository.findAllIncludingDeleted());
        }
        if (regionId != null) {
            return ApiResponse.success(storeRepository.findByRegionId(regionId));
        }
        if (regionName != null && !regionName.isBlank()) {
            Region r = regionRepository.findByNameIgnoreCase(regionName).orElse(null);
            if (r == null) return ApiResponse.success(List.of());
            return ApiResponse.success(storeRepository.findByRegionId(r.getId()));
        }
        return ApiResponse.success(storeRepository.findAll());
    }

    @PostMapping
    public ApiResponse<Store> createStore(@RequestBody Store store, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        // only SUPER_ADMIN can create stores
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");
            if (store.getRegion() != null && store.getRegion().getId() != null) {
                Region region = regionRepository.findById(store.getRegion().getId()).orElse(null);
                if (region == null) return ApiResponse.error("Khu vực không tồn tại hoặc đã ngưng hoạt động");
                store.setRegion(region);
            }
            Store saved = storeRepository.save(store);
            return ApiResponse.success("Store created", saved);
        } catch (Exception ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @PutMapping("/{id}")
    public ApiResponse<Store> updateStore(@PathVariable Long id, @RequestBody Store body,
                                          @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long userId = Long.parseLong(uid);
            User u = userRepository.findById(userId).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN)
                return ApiResponse.error("Forbidden");
            Store store = storeRepository.findById(id).orElse(null);
            if (store == null) return ApiResponse.error("Cửa hàng không tồn tại");
            if (body.getName() != null && !body.getName().isBlank()) store.setName(body.getName());
            if (body.getAddress() != null) store.setAddress(body.getAddress());
            if (body.getLatitude() != null) store.setLatitude(body.getLatitude());
            if (body.getLongitude() != null) store.setLongitude(body.getLongitude());
            if (body.getRegion() != null && body.getRegion().getId() != null) {
                Region region = regionRepository.findById(body.getRegion().getId()).orElse(null);
                if (region == null) return ApiResponse.error("Khu vực không tồn tại hoặc đã ngưng hoạt động");
                store.setRegion(region);
            }
            return ApiResponse.success("Cập nhật cửa hàng thành công", storeRepository.save(store));
        } catch (Exception ex) {
            return ApiResponse.error("Lỗi: " + ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ApiResponse<String> deleteStore(@PathVariable Long id, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long userId = Long.parseLong(uid);
            User u = userRepository.findById(userId).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");

            // Soft delete all active store admins and shippers of this store
            List<User> activeAdmins = userRepository.findByRoleAndStoreId(Role.STORE_ADMIN, id);
            List<User> activeShippers = userRepository.findByRoleAndStoreId(Role.SHIPPER, id);
            for (User user : activeAdmins) {
                user.setDeleted(true);
                userRepository.save(user);
            }
            for (User user : activeShippers) {
                user.setDeleted(true);
                userRepository.save(user);
            }

            storeRepository.deleteById(id);
            return ApiResponse.success("Store deleted", null);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            return ApiResponse.error("Không thể xóa cửa hàng vì còn dữ liệu liên kết (sản phẩm, đơn hàng, tồn kho, phiếu nhập hoặc người dùng).");
        } catch (Exception ex) {
            return ApiResponse.error("Xóa cửa hàng thất bại: " + ex.getMessage());
        }
    }

    @PatchMapping("/{id}/restore")
    @Transactional
    public ApiResponse<Store> restoreStore(@PathVariable Long id, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long userId = Long.parseLong(uid);
            User u = userRepository.findById(userId).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");

            Store store = storeRepository.findByIdIncludingDeleted(id).orElse(null);
            if (store == null) return ApiResponse.error("Cửa hàng không tồn tại");
            store.setDeleted(false);
            Store savedStore = storeRepository.save(store);

            // Restore all soft-deleted store admins and shippers of this store
            List<User> storeUsers = userRepository.findStoreAdminsAndShippersIncludingDeleted(id);
            for (User user : storeUsers) {
                user.setDeleted(false);
                userRepository.save(user);
            }

            return ApiResponse.success("Khôi phục cửa hàng thành công", savedStore);
        } catch (Exception ex) {
            return ApiResponse.error("Khôi phục cửa hàng thất bại: " + ex.getMessage());
        }
    }

    @GetMapping("/{id}/products")
    public ApiResponse<List<ProductResponseDto>> productsByStore(@PathVariable Long id) {
        return ApiResponse.success(productService.getByStoreId(id));
    }

    @GetMapping("/{id}/shippers")
    public ApiResponse<List<User>> shippersByStore(@PathVariable Long id, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        // Allow SUPER_ADMIN to view any store shippers. STORE_ADMIN may view only their own store.
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long userId = Long.parseLong(uid);
            User requester = userRepository.findById(userId).orElse(null);
            if (requester == null) return ApiResponse.error("Forbidden");
            if (requester.getRole() == Role.SUPER_ADMIN) {
                return ApiResponse.success(userRepository.findByRoleAndStoreId(Role.SHIPPER, id));
            }
            if (requester.getRole() == Role.STORE_ADMIN) {
                if (requester.getStore() != null && requester.getStore().getId().equals(id)) {
                    return ApiResponse.success(userRepository.findByRoleAndStoreId(Role.SHIPPER, id));
                }
                return ApiResponse.error("Forbidden");
            }
            return ApiResponse.error("Forbidden");
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }
}
