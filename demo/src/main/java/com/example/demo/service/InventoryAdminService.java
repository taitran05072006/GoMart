package com.example.demo.service;

import com.example.demo.dto.inventory.*;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventoryAdminService {
    private final InventoryRepository inventoryRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StockReceiptRepository stockReceiptRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public InventoryAdminService(
            InventoryRepository inventoryRepository,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StockReceiptRepository stockReceiptRepository,
            OrderRepository orderRepository,
            UserRepository userRepository
    ) {
        this.inventoryRepository = inventoryRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.stockReceiptRepository = stockReceiptRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public InventorySummaryResponseDto getSummary(Long storeId) {
        List<Inventory> allInventories = inventoryRepository.findAll();
        final List<Inventory> filteredInventories;
        if (storeId != null) {
            filteredInventories = allInventories.stream()
                    .filter(inv -> inv.getStore() != null && Objects.equals(inv.getStore().getId(), storeId))
                    .toList();
        } else {
            filteredInventories = allInventories;
        }

        List<Product> allProducts = productRepository.findAll();

        Map<Long, List<Inventory>> byProduct = filteredInventories.stream()
                .filter(inv -> inv.getProduct() != null)
                .collect(Collectors.groupingBy(inv -> inv.getProduct().getId()));

        List<InventoryProductSummaryDto> products = allProducts.stream()
                .map(p -> {
                    List<Inventory> rows = byProduct.getOrDefault(p.getId(), new ArrayList<>());
                    int total = rows.stream().mapToInt(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0).sum();
                    List<InventoryStoreQuantityDto> stores = rows.stream()
                            .map(inv -> InventoryStoreQuantityDto.builder()
                                    .storeId(inv.getStore() != null ? inv.getStore().getId() : null)
                                    .storeName(inv.getStore() != null ? inv.getStore().getName() : null)
                                    .quantity(inv.getQuantity() != null ? inv.getQuantity() : 0)
                                    .build())
                            .sorted(Comparator.comparing(InventoryStoreQuantityDto::getStoreName, Comparator.nullsLast(String::compareToIgnoreCase)))
                            .toList();
                    return InventoryProductSummaryDto.builder()
                            .productId(p.getId())
                            .productName(p.getName())
                            .unit(p.getUnit())
                            .totalQuantity(total)
                            .stores(stores)
                            .build();
                })
                .sorted(Comparator.comparing(InventoryProductSummaryDto::getProductName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        List<InventoryStoreSummaryDto> stores = storeRepository.findAll().stream()
                .filter(store -> storeId == null || Objects.equals(store.getId(), storeId))
                .map(store -> {
                    List<Inventory> storeInvs = filteredInventories.stream()
                            .filter(inv -> inv.getStore() != null && Objects.equals(inv.getStore().getId(), store.getId()))
                            .filter(inv -> inv.getProduct() != null)
                            .toList();
                    Map<Long, Inventory> invByProduct = storeInvs.stream()
                            .collect(Collectors.toMap(inv -> inv.getProduct().getId(), inv -> inv, (a, b) -> a));

                    List<InventoryStoreProductDto> items = allProducts.stream()
                            .map(p -> {
                                Inventory inv = invByProduct.get(p.getId());
                                return InventoryStoreProductDto.builder()
                                        .productId(p.getId())
                                        .productName(p.getName())
                                        .unit(p.getUnit())
                                        .quantity(inv != null && inv.getQuantity() != null ? inv.getQuantity() : 0)
                                        .price(inv != null && inv.getSellingPrice() != null ? inv.getSellingPrice() : p.getPrice())
                                        .oldBatchQuantity(inv != null && inv.getOldBatchQuantity() != null ? inv.getOldBatchQuantity() : 0)
                                        .newBatchQuantity(inv != null && inv.getNewBatchQuantity() != null ? inv.getNewBatchQuantity() : 0)
                                        .build();
                            })
                            .sorted(Comparator.comparing(InventoryStoreProductDto::getProductName, Comparator.nullsLast(String::compareToIgnoreCase)))
                            .toList();

                    return InventoryStoreSummaryDto.builder()
                            .storeId(store.getId())
                            .storeName(store.getName())
                            .address(store.getAddress())
                            .products(items)
                            .build();
                })
                .toList();

        return InventorySummaryResponseDto.builder()
                .products(products)
                .stores(stores)
                .build();
    }


    @Transactional(readOnly = true)
    public List<InventoryHistoryResponseDto> getHistory(Long storeId) {
        List<InventoryHistoryResponseDto> result = new ArrayList<>();

        stockReceiptRepository.findAll().stream()
                .filter(receipt -> "APPROVED".equalsIgnoreCase(receipt.getStatus()))
                .filter(receipt -> storeId == null || (receipt.getStore() != null && Objects.equals(receipt.getStore().getId(), storeId)))
                .forEach(receipt -> {
                    for (StockReceiptItem item : receipt.getItems()) {
                        int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                        result.add(InventoryHistoryResponseDto.builder()
                                .id(receipt.getId())
                                .type("IMPORT")
                                .createdAt(receipt.getCreatedAt())
                                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                                .quantity(quantity)
                                .storeId(receipt.getStore() != null ? receipt.getStore().getId() : null)
                                .storeName(receipt.getStore() != null ? receipt.getStore().getName() : null)
                                .referenceCode(receipt.getCode())
                                .note(receipt.getNote())
                                .build());
                    }
                });

        orderRepository.findAll().stream()
                .filter(order -> order.getStore() != null)
                .filter(order -> storeId == null || Objects.equals(order.getStore().getId(), storeId))
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED && order.getStatus() != OrderStatus.RETURNED)
                .forEach(order -> {
                    if (order.getItems() == null) return;
                    for (OrderItem item : order.getItems()) {
                        double conversionRate = item.getConversionRate() != null ? item.getConversionRate() : 1.0;
                        int quantity = (int) Math.round((item.getQuantity() != null ? item.getQuantity() : 0) * conversionRate);
                        result.add(InventoryHistoryResponseDto.builder()
                                .id(order.getId())
                                .type("EXPORT")
                                .createdAt(order.getCreatedAt())
                                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                                .quantity(quantity)
                                .storeId(order.getStore().getId())
                                .storeName(order.getStore().getName())
                                .referenceCode(order.getOrderCode())
                                .note("Bán hàng")
                                .build());
                    }
                });



        result.sort((a, b) -> {
            LocalDateTime left = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
            LocalDateTime right = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
            return right.compareTo(left);
        });

        return result;
    }


}