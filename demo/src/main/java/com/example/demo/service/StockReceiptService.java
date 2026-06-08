package com.example.demo.service;

import com.example.demo.dto.stock.StockReceiptItemRequestDto;
import com.example.demo.dto.stock.StockReceiptItemResponseDto;
import com.example.demo.dto.stock.StockReceiptRequestDto;
import com.example.demo.dto.stock.StockReceiptResponseDto;
import com.example.demo.entity.Product;
import com.example.demo.entity.StockReceipt;
import com.example.demo.entity.StockReceiptItem;
import com.example.demo.entity.Supplier;
import com.example.demo.entity.ImportUnitType;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.StockReceiptRepository;
import com.example.demo.repository.SupplierRepository;
import com.example.demo.repository.ImportUnitTypeRepository;
import com.example.demo.repository.StoreRepository;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.entity.Store;
import com.example.demo.entity.Inventory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class StockReceiptService {

    private final StockReceiptRepository receiptRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final ImportUnitTypeRepository importUnitTypeRepository;
    private final StoreRepository storeRepository;
    private final InventoryRepository inventoryRepository;

    public StockReceiptService(StockReceiptRepository receiptRepository, SupplierRepository supplierRepository,
                               ProductRepository productRepository, ImportUnitTypeRepository importUnitTypeRepository,
                               StoreRepository storeRepository, InventoryRepository inventoryRepository){
        this.productRepository = productRepository;
        this.receiptRepository = receiptRepository;
        this.supplierRepository = supplierRepository;
        this.importUnitTypeRepository = importUnitTypeRepository;
        this.storeRepository = storeRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public StockReceiptResponseDto createReceipt(StockReceiptRequestDto dto){
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp"));

        Store store = null;
        if (dto.getStoreId() != null) {
            store = storeRepository.findById(dto.getStoreId()).orElse(null);
        }
        if (store == null) {
            throw new RuntimeException("Vui lòng chọn cửa hàng trước khi tạo phiếu nhập");
        }

        StockReceipt receipt = StockReceipt.builder()
                .code(dto.getCode())
                .note(dto.getNote())
                .supplier(supplier)
                .supplierName(supplier.getName())
                .status("PENDING") // Chờ duyệt
                .store(store)
                .build();

        List<StockReceiptItem> items = new ArrayList<>();
        double totalPrice = 0;

        for (StockReceiptItemRequestDto itemDto : dto.getItems()) {

            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

            StockReceiptItem item = new StockReceiptItem();
            item.setProduct(product);
            item.setQuantity(itemDto.getQuantity());
            item.setPrice(itemDto.getPrice());
            item.setManufactureDate(itemDto.getManufactureDate());
            item.setExpiryDate(itemDto.getExpiryDate());
            if (itemDto.getImportUnitTypeId() != null) {
                ImportUnitType unitType = importUnitTypeRepository.findById(itemDto.getImportUnitTypeId()).orElse(null);
                item.setImportUnitType(unitType);
            }
            item.setImportConversionRate(itemDto.getImportConversionRate());

            item.setReceipt(receipt);

            totalPrice += itemDto.getQuantity() * itemDto.getPrice();

            items.add(item);
        }

        receipt.setItems(items);
        receipt.setTotalPrice(totalPrice);
        receipt.setTotalQuantity(items.stream().mapToInt(StockReceiptItem::getQuantity).sum());

        // 4. Lưu qua repository
        StockReceipt saved = receiptRepository.save(receipt);

        // 5. Trả response
        return mapToResponse(saved);
    }
    private StockReceiptResponseDto mapToResponse(StockReceipt receipt) {

        List<StockReceiptItemResponseDto> itemDtos = receipt.getItems().stream()
                .map(item -> StockReceiptItemResponseDto.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productUnit(item.getProduct().getUnit())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .totalPrice(item.getQuantity() * item.getPrice())
                        .manufactureDate(item.getManufactureDate())
                        .expiryDate(item.getExpiryDate())
                        .importUnitTypeId(item.getImportUnitType() != null ? item.getImportUnitType().getId() : null)
                        .importUnitName(item.getImportUnitType() != null ? item.getImportUnitType().getName() : null)
                        .importConversionRate(item.getImportConversionRate())
                        .build()
                ).toList();

        return StockReceiptResponseDto.builder()
                .id(receipt.getId())
                .code(receipt.getCode())
                .supplier(receipt.getSupplier().getName())
                .createdAt(receipt.getCreatedAt())
                .totalPrice(receipt.getTotalPrice())
                .totalQuantity(receipt.getTotalQuantity() != null ? receipt.getTotalQuantity() : 0)
                .note(receipt.getNote())
                .status(receipt.getStatus())
                .storeId(receipt.getStore() != null ? receipt.getStore().getId() : null)
                .storeName(receipt.getStore() != null ? receipt.getStore().getName() : null)
                .items(itemDtos)
                .build();
    }

    @Transactional
    public StockReceiptResponseDto approveReceipt(Long id, String status) {
        StockReceipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu nhập"));

        if (!"PENDING".equals(receipt.getStatus())) {
            throw new RuntimeException("Phiếu nhập này đã được xử lý");
        }

        if ("APPROVED".equals(status)) {
            for (StockReceiptItem item : receipt.getItems()) {
                Product product = item.getProduct();
                double conv = item.getImportConversionRate() != null ? item.getImportConversionRate() : 1.0;
                int addedBaseUnits = (int) Math.round(item.getQuantity() * conv);

                if (receipt.getStore() != null) {
                    Inventory inv = inventoryRepository.findByStoreIdAndProductId(receipt.getStore().getId(), product.getId());
                    if (inv == null) {
                        inv = Inventory.builder()
                                .store(receipt.getStore())
                                .product(product)
                                .quantity(addedBaseUnits)
                                .sellingPrice(product.getPrice())
                                .oldBatchQuantity(0)
                                .newBatchQuantity(addedBaseUnits)
                                .isSelling(true)
                                .build();
                    } else {
                        int currentInvStock = inv.getQuantity() != null ? inv.getQuantity() : 0;
                        inv.setOldBatchQuantity(currentInvStock);
                        inv.setNewBatchQuantity(addedBaseUnits);
                        inv.setQuantity(currentInvStock + addedBaseUnits);
                        if (inv.getSellingPrice() == null) {
                            inv.setSellingPrice(product.getPrice());
                        }
                    }
                    inventoryRepository.save(inv);
                }
                
                int currentStock = product.getStock() != null ? product.getStock() : 0;
                product.setOldBatchQuantity(currentStock);
                product.setNewBatchQuantity(addedBaseUnits);
                product.setStock(currentStock + addedBaseUnits);

                if (item.getManufactureDate() != null) product.setManufactureDate(item.getManufactureDate());
                if (item.getExpiryDate() != null) product.setExpiryDate(item.getExpiryDate());

                productRepository.save(product);
            }
        }

        receipt.setStatus(status);
        StockReceipt saved = receiptRepository.save(receipt);
        return mapToResponse(saved);
    }
    public List<StockReceiptResponseDto> getAll(){
        List<StockReceipt> stockReceipt = receiptRepository.findAll();
        return stockReceipt.stream().map(this::mapToResponse).toList();
    }
    public StockReceiptResponseDto getById(Long id){
        StockReceipt stockReceipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiếu nhập"));
        return mapToResponse(stockReceipt);
    }
}
