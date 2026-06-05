package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.entity.ImportUnitType;
import com.example.demo.repository.ImportUnitTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/import-unit-types")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ImportUnitTypeController {

    private final ImportUnitTypeRepository repository;

    @GetMapping
    public ApiResponse<List<ImportUnitType>> getAll() {
        return ApiResponse.success("Lấy danh sách đơn vị nhập thành công", repository.findAll());
    }
}
