package com.example.demo.dto.stock;

import lombok.Data;

@Data
public class StockReceiptItemRequestDto {

    private Long productId;

    private Integer quantity;

    private Double price; // ✅ thêm vào
    private java.time.LocalDate manufactureDate;
    private java.time.LocalDate expiryDate;
    // optional: id của loại đơn vị khi nhập (tham chiếu import_unit_types.id)
    private Long importUnitTypeId;
    // optional: hệ số quy đổi từ đơn vị nhập sang đơn vị bán của sản phẩm
    private Double importConversionRate;
}