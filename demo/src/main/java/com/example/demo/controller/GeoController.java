package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.entity.Region;
import com.example.demo.entity.Store;
import com.example.demo.service.RegionDetectionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/geo")
@CrossOrigin(origins = "*")
public class GeoController {
    private final RegionDetectionService detectionService;

    public GeoController(RegionDetectionService detectionService) {
        this.detectionService = detectionService;
    }

    @GetMapping("/detect")
    public ApiResponse<?> detectRegion(@RequestParam String address) {
        Region r = detectionService.detectRegionByAddress(address);
        if (r == null) return ApiResponse.success("No region detected", List.of());
        List<Store> stores = detectionService.storesByAddress(address);
        return ApiResponse.success("OK", new Object() {
            public final Region region = r;
            public final List<Store> storesList = stores;
        });
    }
}
