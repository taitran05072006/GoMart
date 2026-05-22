package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.stock.StockReceiptRequestDto;
import com.example.demo.dto.stock.StockReceiptResponseDto;
import com.example.demo.service.StockReceiptService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/admin/stock-receipts")

public class StockReceiptController {
    private final StockReceiptService service;
    public StockReceiptController(StockReceiptService service){
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<StockReceiptResponseDto>> getAll() {
        return ApiResponse.success(service.getAll());
    }
    @GetMapping("/{id:[0-9]+}")
    public ApiResponse<StockReceiptResponseDto> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }
    @PostMapping
    public ApiResponse<StockReceiptResponseDto> create(@RequestBody StockReceiptRequestDto request){
        return ApiResponse.success( service.createReceipt(request));
    }
}
