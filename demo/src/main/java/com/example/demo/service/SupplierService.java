package com.example.demo.service;

import com.example.demo.dto.supplier.SupplierRequestDto;
import com.example.demo.dto.supplier.SupplierResponseDto;
import com.example.demo.entity.Supplier;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.SupplierRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public SupplierResponseDto create(SupplierRequestDto dto) {
        Supplier supplier = Supplier.builder()
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .email(dto.getEmail())
                .supplyType(dto.getSupplyType())
                .build();
        supplier = supplierRepository.save(supplier);
        return mapToDto(supplier);
    }

    public List<SupplierResponseDto> getAll() {
        return supplierRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public SupplierResponseDto getById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp không tồn tại"));
        return mapToDto(supplier);
    }

    public SupplierResponseDto update(Long id, SupplierRequestDto dto) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp không tồn tại"));

        supplier.setName(dto.getName());
        supplier.setPhone(dto.getPhone());
        supplier.setAddress(dto.getAddress());
        supplier.setEmail(dto.getEmail());
        supplier.setSupplyType(dto.getSupplyType());

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
                .build();
    }
}
