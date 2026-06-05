package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.entity.Region;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.RegionRepository;
import com.example.demo.repository.StoreRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.entity.Store;

import java.util.List;

@RestController
@RequestMapping("/api/regions")
@CrossOrigin(origins = "*")
public class RegionController {

    private final RegionRepository regionRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public RegionController(RegionRepository regionRepository, StoreRepository storeRepository, UserRepository userRepository) {
        this.regionRepository = regionRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<Region>> listRegions(@RequestParam(required = false, defaultValue = "false") boolean includeDeleted) {
        if (includeDeleted) {
            return ApiResponse.success(regionRepository.findAllIncludingDeleted());
        }
        return ApiResponse.success(regionRepository.findAll());
    }

    @PostMapping
    public ApiResponse<Region> createRegion(@RequestBody Region region,
                                             @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (!isAdminOrSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        if (region.getName() == null || region.getName().isBlank())
            return ApiResponse.error("Tên khu vực không được để trống");
        Region saved = regionRepository.save(region);
        return ApiResponse.success("Tạo khu vực thành công", saved);
    }

    @PutMapping("/{id}")
    public ApiResponse<Region> updateRegion(@PathVariable Long id,
                                             @RequestBody Region body,
                                             @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (!isAdminOrSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        Region region = regionRepository.findById(id).orElse(null);
        if (region == null) return ApiResponse.error("Khu vực không tồn tại");
        if (body.getName() != null && !body.getName().isBlank()) region.setName(body.getName());
        return ApiResponse.success("Cập nhật thành công", regionRepository.save(region));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ApiResponse<String> deleteRegion(@PathVariable Long id,
                                             @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (!isAdminOrSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        if (!regionRepository.existsById(id)) return ApiResponse.error("Khu vực không tồn tại");

        // Soft delete all stores in this region
        List<Store> stores = storeRepository.findByRegionId(id);
        for (Store store : stores) {
            // Soft delete all active store admins and shippers of this store
            List<User> activeAdmins = userRepository.findByRoleAndStoreId(Role.STORE_ADMIN, store.getId());
            List<User> activeShippers = userRepository.findByRoleAndStoreId(Role.SHIPPER, store.getId());
            for (User user : activeAdmins) {
                user.setDeleted(true);
                userRepository.save(user);
            }
            for (User user : activeShippers) {
                user.setDeleted(true);
                userRepository.save(user);
            }
            storeRepository.deleteById(store.getId());
        }

        regionRepository.deleteById(id);
        return ApiResponse.success("Xóa khu vực thành công", null);
    }

    @PatchMapping("/{id}/restore")
    @Transactional
    public ApiResponse<Region> restoreRegion(@PathVariable Long id,
                                             @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (!isAdminOrSuperAdmin(uid)) return ApiResponse.error("Forbidden");
        Region region = regionRepository.findByIdIncludingDeleted(id).orElse(null);
        if (region == null) return ApiResponse.error("Khu vực không tồn tại");
        
        region.setDeleted(false);
        Region savedRegion = regionRepository.save(region);

        // Restore all stores in this region
        List<Store> deletedStores = storeRepository.findByRegionIdIncludingDeleted(id);
        for (Store store : deletedStores) {
            store.setDeleted(false);
            storeRepository.save(store);

            // Restore all soft-deleted store admins and shippers of this store
            List<User> storeUsers = userRepository.findStoreAdminsAndShippersIncludingDeleted(store.getId());
            for (User user : storeUsers) {
                user.setDeleted(false);
                userRepository.save(user);
            }
        }

        return ApiResponse.success("Khôi phục khu vực thành công", savedRegion);
    }

    private boolean isAdminOrSuperAdmin(String uid) {
        if (uid == null) return false;
        try {
            User u = userRepository.findById(Long.parseLong(uid)).orElse(null);
            return u != null && u.getRole() == Role.SUPER_ADMIN;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
