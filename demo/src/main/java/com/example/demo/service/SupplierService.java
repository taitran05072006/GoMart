package com.example.demo.service;

import com.example.demo.dto.supplier.SupplierRequestDto;
import com.example.demo.dto.supplier.SupplierResponseDto;
import com.example.demo.entity.Role;
import com.example.demo.entity.Store;
import com.example.demo.entity.Supplier;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.StoreRepository;
import com.example.demo.repository.SupplierRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public SupplierService(SupplierRepository supplierRepository, StoreRepository storeRepository, UserRepository userRepository) {
        this.supplierRepository = supplierRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    private Long resolveTargetStoreId(String uidStr, String impersonatedStoreIdStr, Long dtoStoreId) {
        if (uidStr == null) {
            throw new BadRequestException("Không có quyền thực hiện");
        }
        try {
            Long uid = Long.parseLong(uidStr);
            User user = userRepository.findById(uid).orElseThrow(() -> new BadRequestException("Người dùng không tồn tại"));

            if (user.getRole() == Role.STORE_ADMIN) {
                if (user.getStore() == null) {
                    throw new BadRequestException("Tài khoản chưa được gán cửa hàng");
                }
                return user.getStore().getId();
            } else if (user.getRole() == Role.SUPER_ADMIN) {
                if (impersonatedStoreIdStr != null && !impersonatedStoreIdStr.isBlank()) {
                    return Long.parseLong(impersonatedStoreIdStr);
                }
                return dtoStoreId;
            } else {
                throw new BadRequestException("Không có quyền thực hiện");
            }
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid ID format");
        }
    }

    public SupplierResponseDto create(SupplierRequestDto dto, String uid, String impersonatedStoreId) {
        Long targetStoreId = resolveTargetStoreId(uid, impersonatedStoreId, dto.getStoreId());
        Store store = null;
        if (targetStoreId != null) {
            store = storeRepository.findById(targetStoreId).orElseThrow(() -> new ResourceNotFoundException("Cửa hàng không tồn tại"));
        }

        Supplier supplier = Supplier.builder()
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .email(dto.getEmail())
                .supplyType(dto.getSupplyType())
                .store(store)
                .build();
        supplier = supplierRepository.save(supplier);
        return mapToDto(supplier);
    }

    public List<SupplierResponseDto> getAll(String uid, String impersonatedStoreId) {
        if (uid == null) {
            throw new BadRequestException("Không có quyền thực hiện");
        }
        try {
            Long userId = Long.parseLong(uid);
            User user = userRepository.findById(userId).orElseThrow(() -> new BadRequestException("Người dùng không tồn tại"));

            if (user.getRole() == Role.STORE_ADMIN) {
                if (user.getStore() == null) {
                    return List.of();
                }
                return supplierRepository.findByStoreId(user.getStore().getId()).stream().map(this::mapToDto).collect(Collectors.toList());
            } else if (user.getRole() == Role.SUPER_ADMIN) {
                if (impersonatedStoreId != null && !impersonatedStoreId.isBlank()) {
                    Long storeId = Long.parseLong(impersonatedStoreId);
                    return supplierRepository.findByStoreId(storeId).stream().map(this::mapToDto).collect(Collectors.toList());
                }
                return supplierRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
            } else {
                throw new BadRequestException("Không có quyền thực hiện");
            }
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid ID format");
        }
    }

    public SupplierResponseDto getById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp không tồn tại"));
        return mapToDto(supplier);
    }

    public SupplierResponseDto update(Long id, SupplierRequestDto dto, String uid, String impersonatedStoreId) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp không tồn tại"));

        Long targetStoreId = resolveTargetStoreId(uid, impersonatedStoreId, dto.getStoreId());
        Store store = null;
        if (targetStoreId != null) {
            store = storeRepository.findById(targetStoreId).orElseThrow(() -> new ResourceNotFoundException("Cửa hàng không tồn tại"));
        }

        supplier.setName(dto.getName());
        supplier.setPhone(dto.getPhone());
        supplier.setAddress(dto.getAddress());
        supplier.setEmail(dto.getEmail());
        supplier.setSupplyType(dto.getSupplyType());
        supplier.setStore(store);

        supplier = supplierRepository.save(supplier);
        return mapToDto(supplier);
    }

    public void delete(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp không tồn tại"));
        
        if (supplier.getEmail() != null) {
            supplier.setEmail(supplier.getEmail() + "_deleted_" + System.currentTimeMillis());
        }
        if (supplier.getPhone() != null) {
            supplier.setPhone(supplier.getPhone() + "_deleted_" + System.currentTimeMillis());
        }
        supplierRepository.save(supplier);
        
        supplierRepository.delete(supplier);
    }

    private SupplierResponseDto mapToDto(Supplier supplier) {
        return SupplierResponseDto.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .phone(supplier.getPhone())
                .address(supplier.getAddress())
                .email(supplier.getEmail())
                .supplyType(supplier.getSupplyType())
                .storeId(supplier.getStore() != null ? supplier.getStore().getId() : null)
                .storeName(supplier.getStore() != null ? supplier.getStore().getName() : null)
                .build();
    }
}
