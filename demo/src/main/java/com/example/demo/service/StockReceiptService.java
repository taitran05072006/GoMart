package com.example.demo.service;

import com.example.demo.dto.stock.StockReceiptItemRequestDto;
import com.example.demo.dto.stock.StockReceiptItemResponseDto;
import com.example.demo.dto.stock.StockReceiptRequestDto;
import com.example.demo.dto.stock.StockReceiptResponseDto;
import com.example.demo.entity.Product;
import com.example.demo.entity.StockReceipt;
import com.example.demo.entity.StockReceiptItem;
import com.example.demo.entity.Supplier;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.StockReceiptRepository;
import com.example.demo.repository.SupplierRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class StockReceiptService {

    private final StockReceiptRepository receiptRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    public StockReceiptService(StockReceiptRepository receiptRepository, SupplierRepository supplierRepository ,ProductRepository productRepository){
        this.productRepository = productRepository;
        this.receiptRepository = receiptRepository;
        this.supplierRepository = supplierRepository;
    }

    public StockReceiptResponseDto createReceipt(StockReceiptRequestDto dto){
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp"));

        // 2. Tạo receipt
        StockReceipt receipt = StockReceipt.builder()
                .code(dto.getCode())
                .note(dto.getNote())
                .supplier(supplier)
                .supplierName(supplier.getName())
                .build();

        List<StockReceiptItem> items = new ArrayList<>();
        double totalPrice = 0;

        // 3. Xử lý từng item
        for (StockReceiptItemRequestDto itemDto : dto.getItems()) {

            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

            StockReceiptItem item = new StockReceiptItem();
            item.setProduct(product);
            item.setQuantity(itemDto.getQuantity());
            item.setPrice(itemDto.getPrice());
            item.setManufactureDate(itemDto.getManufactureDate());
            item.setExpiryDate(itemDto.getExpiryDate());

            // 🔥 QUAN TRỌNG
            item.setReceipt(receipt);

            // 🔥 update tồn kho theo lô (FIFO đơn giản)
            // Lượng tồn kho hiện tại sẽ chuyển thành lô cũ, lượng mới nhập vào là lô mới
            int currentStock = product.getStock() != null ? product.getStock() : 0;
            product.setOldBatchQuantity(currentStock);
            product.setNewBatchQuantity(itemDto.getQuantity());
            product.setStock(currentStock + itemDto.getQuantity());
            
            // Cập nhật NSX/HSD cho sản phẩm (theo lô mới nhất)
            if (itemDto.getManufactureDate() != null) product.setManufactureDate(itemDto.getManufactureDate());
            if (itemDto.getExpiryDate() != null) product.setExpiryDate(itemDto.getExpiryDate());

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
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .totalPrice(item.getQuantity() * item.getPrice())
                        .manufactureDate(item.getManufactureDate())
                        .expiryDate(item.getExpiryDate())
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
                .items(itemDtos)
                .build();
    }
    public List<StockReceiptResponseDto> getAll(){
        List<StockReceipt> stockReceipt = receiptRepository.findAll();
        return stockReceipt.stream().map(this::mapToResponse).toList();
    }
    public StockReceiptResponseDto getById(Long id){
        StockReceipt stockReceipt = receiptRepository.getById(id);
        return mapToResponse(stockReceipt);
    }
}
