package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InventorySummaryResponseDto {
    private List<InventoryProductSummaryDto> products;
    private List<InventoryStoreSummaryDto> stores;
}