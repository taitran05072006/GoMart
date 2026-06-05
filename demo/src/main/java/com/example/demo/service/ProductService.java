package com.example.demo.service;

import com.example.demo.dto.product.ProductRequestDto;
import com.example.demo.dto.product.ProductResponseDto;
import com.example.demo.dto.product.ProductUnitDto;
import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.entity.ProductUnit;
import com.example.demo.repository.ProductUnitRepository;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.repository.ImportUnitTypeRepository;
import com.example.demo.entity.Inventory;
import com.example.demo.entity.ImportUnitType;
import com.example.demo.entity.Store;
import com.example.demo.repository.StoreRepository;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductUnitRepository productUnitRepository;
    private final InventoryRepository inventoryRepository;
    private final StoreRepository storeRepository;
    private final ImportUnitTypeRepository importUnitTypeRepository;
    private final com.example.demo.repository.ImportUnitRepository importUnitRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository,
                          ProductUnitRepository productUnitRepository, InventoryRepository inventoryRepository,
                          StoreRepository storeRepository,
                          ImportUnitTypeRepository importUnitTypeRepository,
                          com.example.demo.repository.ImportUnitRepository importUnitRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productUnitRepository = productUnitRepository;
        this.inventoryRepository = inventoryRepository;
        this.storeRepository = storeRepository;
        this.importUnitTypeRepository = importUnitTypeRepository;
        this.importUnitRepository = importUnitRepository;
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void migrateInventory() {
        List<Inventory> inventories = inventoryRepository.findAll();
        boolean changed = false;
        for (Inventory inv : inventories) {
            if (inv.getOldPrice() == null && inv.getProduct() != null) {
                Product p = inv.getProduct();
                inv.setOldPrice(p.getOldPrice());
                inv.setDiscount(p.getDiscount());
                inv.setOldBatchQuantity(0);
                inv.setNewBatchQuantity(inv.getQuantity());
                inv.setImportUnitType(p.getImportUnitType());
                inv.setImportConversionRate(p.getImportConversionRate());
                changed = true;
            }
        }
        if (changed) {
            inventoryRepository.saveAll(inventories);
            System.out.println("Migrated " + inventories.size() + " inventories with product defaults.");
        }
    }

    @Transactional
    public ProductResponseDto updateForStore(Long id, ProductRequestDto dto, Long storeId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        // update or create inventory for given store
        Inventory inv = inventoryRepository.findByStoreIdAndProductId(storeId, id);
        if (inv == null) {
            Store store = storeRepository.findById(storeId).orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng"));
            inv = Inventory.builder()
                    .product(product)
                    .store(store)
                    .quantity(dto.getStock() != null ? dto.getStock() : 0)
                    .sellingPrice(dto.getPrice() != null ? dto.getPrice() : product.getPrice())
                    .oldPrice(product.getOldPrice())
                    .discount(product.getDiscount())
                    .isSelling(true)
                    .build();
        }

        if (dto.getStock() != null) inv.setQuantity(dto.getStock());
        if (dto.getPrice() != null) inv.setSellingPrice(dto.getPrice());
        if (dto.getOldPrice() != null) inv.setOldPrice(dto.getOldPrice());
        if (dto.getDiscount() != null) inv.setDiscount(dto.getDiscount());
        if (dto.getOldBatchQuantity() != null) inv.setOldBatchQuantity(dto.getOldBatchQuantity());
        if (dto.getNewBatchQuantity() != null) inv.setNewBatchQuantity(dto.getNewBatchQuantity());

        // Import Unit for store - deduplicate by name
        ImportUnitType importUnitType = null;
        if (dto.getImportUnitTypeId() != null) {
            importUnitType = importUnitTypeRepository.findById(dto.getImportUnitTypeId()).orElse(null);
        } else if (dto.getImportUnitName() != null && !dto.getImportUnitName().trim().isEmpty()) {
            final String unitName = dto.getImportUnitName().trim();
            importUnitType = importUnitTypeRepository.findAll().stream()
                    .filter(t -> unitName.equalsIgnoreCase(t.getName()))
                    .findFirst()
                    .orElseGet(() -> importUnitTypeRepository.save(ImportUnitType.builder().name(unitName).build()));
        }
        if (importUnitType != null) {
            inv.setImportUnitType(importUnitType);
        }
        if (dto.getImportConversionRate() != null) {
            inv.setImportConversionRate(dto.getImportConversionRate());
        }

        inventoryRepository.save(inv);

        // Lưu đơn vị nhập vào bảng ImportUnit (hỗ trợ nhiều đơn vị)
        if (dto.getImportUnits() != null && !dto.getImportUnits().isEmpty()) {
            importUnitRepository.deleteByProductId(id);
            List<com.example.demo.entity.ImportUnit> importUnitsList = dto.getImportUnits().stream().map(iu -> {
                ImportUnitType type = null;
                if (iu.getImportUnitTypeId() != null) {
                    type = importUnitTypeRepository.findById(iu.getImportUnitTypeId()).orElse(null);
                } else if (iu.getName() != null && !iu.getName().trim().isEmpty()) {
                    final String typeName = iu.getName().trim();
                    type = importUnitTypeRepository.findAll().stream()
                            .filter(t -> typeName.equalsIgnoreCase(t.getName()))
                            .findFirst()
                            .orElseGet(() -> importUnitTypeRepository.save(ImportUnitType.builder().name(typeName).build()));
                }
                return com.example.demo.entity.ImportUnit.builder()
                        .unitType(type)
                        .conversionRate(iu.getConversionRate() != null ? iu.getConversionRate() : 1.0)
                        .costPrice(iu.getCostPrice())
                        .oldCostPrice(iu.getOldCostPrice())
                        .product(product)
                        .build();
            }).toList();
            importUnitRepository.saveAll(importUnitsList);
        }

        // Lưu đơn vị quy đổi & giá vào bảng ProductUnit (dữ liệu hệ thống, SUPER_ADMIN có thể sửa)
        if (dto.getUnits() != null && !dto.getUnits().isEmpty()) {
            productUnitRepository.deleteByProductId(id);
            List<ProductUnit> unitsList = dto.getUnits().stream()
                    .map(u -> ProductUnit.builder()
                            .name(u.getName())
                            .conversionRate(u.getConversionRate())
                            .price(u.getPrice() != null ? u.getPrice().intValue() : null)
                            .oldPrice(u.getOldPrice() != null ? u.getOldPrice().intValue() : null)
                            .product(product)
                            .build())
                    .toList();
            productUnitRepository.saveAll(unitsList);
        }

        return getById(id, storeId);
    }

    private List<ProductResponseDto> mapToWithGlobalStock(List<Product> products) {
        List<Inventory> allInvs = inventoryRepository.findAll();
        Map<Long, Integer> stockMap = allInvs.stream()
                .collect(Collectors.groupingBy(
                        inv -> inv.getProduct().getId(),
                        Collectors.summingInt(Inventory::getQuantity)
                ));

        return products.stream().map(p -> {
            ProductResponseDto dto = mapTo(p);
            dto.setStock(stockMap.getOrDefault(p.getId(), 0));
            return dto;
        }).collect(Collectors.toList());
    }

    public List<ProductResponseDto> getAll(){
        return mapToWithGlobalStock(productRepository.findByIsDeletedFalse());
    }

    public List<ProductResponseDto> getByStoreId(Long storeId) {
        List<Product> allProducts = productRepository.findByIsDeletedFalse();

        List<Inventory> activeInventories = inventoryRepository.findAll().stream()
                .filter(i -> i.getStore() != null && i.getStore().getId().equals(storeId))
                .filter(i -> Boolean.TRUE.equals(i.getIsSelling()))
                .collect(Collectors.toList());

        Map<Long, Inventory> inventoryMap = activeInventories.stream()
                .collect(Collectors.toMap(i -> i.getProduct().getId(), i -> i, (a, b) -> a));

        return allProducts.stream()
                .filter(p -> inventoryMap.containsKey(p.getId())) // CHỈ TRẢ VỀ CÁC SẢN PHẨM MÀ CỬA HÀNG ĐANG BÁN
                .map(p -> {
                    ProductResponseDto dto = mapTo(p);
                    Inventory inventory = inventoryMap.get(p.getId());
                    dto.setStock(inventory.getQuantity());
                    if (inventory.getSellingPrice() != null) dto.setPrice(inventory.getSellingPrice());
                    if (inventory.getOldPrice() != null) dto.setOldPrice(inventory.getOldPrice());
                    if (inventory.getDiscount() != null) dto.setDiscount(inventory.getDiscount());
                    if (inventory.getOldBatchQuantity() != null) dto.setOldBatchQuantity(inventory.getOldBatchQuantity());
                    if (inventory.getNewBatchQuantity() != null) dto.setNewBatchQuantity(inventory.getNewBatchQuantity());
                    if (inventory.getImportUnitType() != null) {
                        dto.setImportUnitTypeId(inventory.getImportUnitType().getId());
                        dto.setImportUnitName(inventory.getImportUnitType().getName());
                    }
                    if (inventory.getImportConversionRate() != null) dto.setImportConversionRate(inventory.getImportConversionRate());
                    dto.setIsSelling(true);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public ProductResponseDto toggleSelling(Long id, Long storeId) {
        Product product = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        Store store = storeRepository.findById(storeId).orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng"));

        Inventory inv = inventoryRepository.findByStoreIdAndProductId(storeId, id);
        if (inv == null) {
            inv = Inventory.builder()
                    .product(product)
                    .store(store)
                    .quantity(0)
                    .sellingPrice(product.getPrice())
                    .oldPrice(product.getOldPrice())
                    .discount(product.getDiscount())
                    .oldBatchQuantity(0)
                    .newBatchQuantity(0)
                    .importUnitType(product.getImportUnitType())
                    .importConversionRate(product.getImportConversionRate())
                    .isSelling(true)
                    .build();
        } else {
            inv.setIsSelling(!Boolean.TRUE.equals(inv.getIsSelling()));
        }
        inventoryRepository.save(inv);
        return getById(id, storeId);
    }

    public ProductResponseDto getById(Long id, Long storeId){
        Product product = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm!"));
        if(product.getIsDeleted()) throw new RuntimeException("Sản phẩm đã bị xóa!");
        ProductResponseDto dto = mapTo(product);
        if (storeId != null) {
            Inventory inv = inventoryRepository.findByStoreIdAndProductId(storeId, id);
            if (inv != null) {
                dto.setStock(inv.getQuantity());
                if (inv.getSellingPrice() != null) dto.setPrice(inv.getSellingPrice());
                if (inv.getOldPrice() != null) dto.setOldPrice(inv.getOldPrice());
                if (inv.getDiscount() != null) dto.setDiscount(inv.getDiscount());
                if (inv.getOldBatchQuantity() != null) dto.setOldBatchQuantity(inv.getOldBatchQuantity());
                if (inv.getNewBatchQuantity() != null) dto.setNewBatchQuantity(inv.getNewBatchQuantity());
                if (inv.getImportUnitType() != null) {
                    dto.setImportUnitTypeId(inv.getImportUnitType().getId());
                    dto.setImportUnitName(inv.getImportUnitType().getName());
                }
                if (inv.getImportConversionRate() != null) dto.setImportConversionRate(inv.getImportConversionRate());
            } else {
                dto.setStock(0);
            }
        } else {
            List<Inventory> invs = inventoryRepository.findByProductId(id);
            int total = invs.stream().mapToInt(Inventory::getQuantity).sum();
            dto.setStock(total);
        }
        return dto;
    }

    public List<ProductResponseDto> getByCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));
        return mapToWithGlobalStock(productRepository.findByCategoryAndIsDeletedFalse(category));
    }

    public ProductResponseDto create(ProductRequestDto dto, Long storeId){
        Category category = categoryRepository.findById(dto.getCategoryId()).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục của sản phẩm"));

        ImportUnitType importUnitType = null;
        if (dto.getImportUnitTypeId() != null) {
            importUnitType = importUnitTypeRepository.findById(dto.getImportUnitTypeId()).orElse(null);
        } else if (dto.getImportUnitName() != null && !dto.getImportUnitName().trim().isEmpty()) {
            importUnitType = ImportUnitType.builder().name(dto.getImportUnitName().trim()).build();
            importUnitType = importUnitTypeRepository.save(importUnitType);
        }

        Product product = Product.builder()
                .name(dto.getName())
                .imageUrl(dto.getImageUrl())
                .bg(dto.getBg())
                .price(dto.getPrice())
                .oldPrice(dto.getOldPrice())
                .discount(dto.getDiscount())
                .rating(dto.getRating())
                .reviews(dto.getReviews())
                .tag(dto.getTag())
                .unit(dto.getUnit())
                .stock(dto.getStock())
                .sold(0)
                .oldBatchQuantity(dto.getOldBatchQuantity())
                .newBatchQuantity(dto.getNewBatchQuantity())
                .manufactureDate(dto.getManufactureDate())
                .expiryDate(dto.getExpiryDate())
                .description(dto.getDescription())
                .importUnitType(importUnitType)
                .importConversionRate(dto.getImportConversionRate())
                .category(category)
                .isDeleted(false)
                .build();
        final Product savedProduct = productRepository.saveAndFlush(product);

        // Chỉ tạo Inventory cho storeId truyền vào (nếu có)
        if (storeId != null) {
            Store targetStore = storeRepository.findById(storeId).orElse(null);
            if (targetStore != null) {
                Inventory newInv = Inventory.builder()
                        .product(savedProduct)
                        .store(targetStore)
                        .quantity(dto.getStock() != null ? dto.getStock() : 0)
                        .sellingPrice(savedProduct.getPrice())
                        .oldPrice(savedProduct.getOldPrice())
                        .discount(savedProduct.getDiscount())
                        .oldBatchQuantity(dto.getOldBatchQuantity() != null ? dto.getOldBatchQuantity() : 0)
                        .newBatchQuantity(dto.getNewBatchQuantity() != null ? dto.getNewBatchQuantity() : 0)
                        .importUnitType(savedProduct.getImportUnitType())
                        .importConversionRate(savedProduct.getImportConversionRate())
                        .isSelling(true)
                        .build();
                inventoryRepository.save(newInv);
            }
        }

        // Lưu đơn vị quy đổi
        if (dto.getUnits() != null) {
            List<ProductUnit> units = dto.getUnits().stream()
                    .map(u -> ProductUnit.builder()
                            .name(u.getName())
                            .conversionRate(u.getConversionRate())
                            .price(u.getPrice() != null ? u.getPrice().intValue() : null)
                            .oldPrice(u.getOldPrice() != null ? u.getOldPrice().intValue() : null)
                            .product(savedProduct)
                            .build())
                    .toList();
            productUnitRepository.saveAll(units);
        }

        // Lưu đơn vị nhập
        if (dto.getImportUnits() != null) {
            List<com.example.demo.entity.ImportUnit> importUnitsList = dto.getImportUnits().stream().map(iu -> {
                ImportUnitType type = null;
                if (iu.getImportUnitTypeId() != null) {
                    type = importUnitTypeRepository.findById(iu.getImportUnitTypeId()).orElse(null);
                } else if (iu.getName() != null && !iu.getName().trim().isEmpty()) {
                    type = ImportUnitType.builder().name(iu.getName().trim()).build();
                    type = importUnitTypeRepository.save(type);
                }
                return com.example.demo.entity.ImportUnit.builder()
                        .unitType(type)
                        .conversionRate(iu.getConversionRate() != null ? iu.getConversionRate() : 1.0)
                        .costPrice(iu.getCostPrice() != null ? iu.getCostPrice() : null)
                        .oldCostPrice(iu.getOldCostPrice() != null ? iu.getOldCostPrice() : null)
                        .product(savedProduct)
                        .build();
            }).toList();
            importUnitRepository.saveAll(importUnitsList);
        }

        return mapTo(savedProduct);
    }

    public List<ProductResponseDto> searchAll(
            String keyword,
            Long categoryId,
            Double minPrice,
            Double maxPrice
    ) {
        return mapToWithGlobalStock(productRepository.searchAll(
                keyword,
                categoryId,
                minPrice,
                maxPrice
        ));
    }

    // ================= UPDATE =================
    public ProductResponseDto update(Long id, ProductRequestDto dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục của sản phẩm"));

        ImportUnitType importUnitType = null;
        if (dto.getImportUnitTypeId() != null) {
            importUnitType = importUnitTypeRepository.findById(dto.getImportUnitTypeId()).orElse(null);
        } else if (dto.getImportUnitName() != null && !dto.getImportUnitName().trim().isEmpty()) {
            importUnitType = ImportUnitType.builder().name(dto.getImportUnitName().trim()).build();
            importUnitType = importUnitTypeRepository.save(importUnitType);
        }

        product.setName(dto.getName());
        product.setImageUrl(dto.getImageUrl());
        product.setBg(dto.getBg());
        product.setPrice(dto.getPrice());
        product.setOldPrice(dto.getOldPrice());
        product.setDiscount(dto.getDiscount());
        product.setRating(dto.getRating());
        product.setReviews(dto.getReviews());
        product.setTag(dto.getTag());
        product.setUnit(dto.getUnit());
        // NOTE: When updating globally (no storeId), do not modify per-store inventory quantities here.
        // Global stock (product.stock) is kept for legacy/read-only purposes and should not be edited by SUPER_ADMIN in "Toàn hệ thống" mode.
        product.setOldBatchQuantity(dto.getOldBatchQuantity());
        product.setNewBatchQuantity(dto.getNewBatchQuantity());
        product.setManufactureDate(dto.getManufactureDate());
        product.setExpiryDate(dto.getExpiryDate());
        product.setDescription(dto.getDescription());
        product.setImportUnitType(importUnitType);
        product.setImportConversionRate(dto.getImportConversionRate());
        product.setCategory(category);

        productRepository.save(product);

        // Đồng bộ thông tin giá bán, chiết khấu và đơn vị nhập xuống tất cả cửa hàng đang bán sản phẩm này
        List<Inventory> inventories = inventoryRepository.findByProductId(product.getId());
        for (Inventory inv : inventories) {
            inv.setSellingPrice(product.getPrice());
            inv.setOldPrice(product.getOldPrice());
            inv.setDiscount(product.getDiscount());
            inv.setImportUnitType(product.getImportUnitType());
            inv.setImportConversionRate(product.getImportConversionRate());
            inventoryRepository.save(inv);
        }

        // Cập nhật đơn vị quy đổi (Xóa cũ - Thêm mới)
        productUnitRepository.deleteByProductId(product.getId());
        if (dto.getUnits() != null) {
            List<ProductUnit> units = dto.getUnits().stream()
                    .map(u -> ProductUnit.builder()
                            .name(u.getName())
                            .conversionRate(u.getConversionRate())
                            .price(u.getPrice() != null ? u.getPrice().intValue() : null)
                            .oldPrice(u.getOldPrice() != null ? u.getOldPrice().intValue() : null)
                            .product(product)
                            .build())
                    .toList();
            productUnitRepository.saveAll(units);
        }

        // Cập nhật đơn vị nhập (Xóa cũ - Thêm mới)
        importUnitRepository.deleteByProductId(product.getId());
        if (dto.getImportUnits() != null) {
            List<com.example.demo.entity.ImportUnit> importUnitsList = dto.getImportUnits().stream().map(iu -> {
                ImportUnitType type = null;
                if (iu.getImportUnitTypeId() != null) {
                    type = importUnitTypeRepository.findById(iu.getImportUnitTypeId()).orElse(null);
                } else if (iu.getName() != null && !iu.getName().trim().isEmpty()) {
                    type = ImportUnitType.builder().name(iu.getName().trim()).build();
                    type = importUnitTypeRepository.save(type);
                }
                return com.example.demo.entity.ImportUnit.builder()
                        .unitType(type)
                        .conversionRate(iu.getConversionRate() != null ? iu.getConversionRate() : 1.0)
                        .costPrice(iu.getCostPrice() != null ? iu.getCostPrice() : null)
                        .oldCostPrice(iu.getOldCostPrice() != null ? iu.getOldCostPrice() : null)
                        .product(product)
                        .build();
            }).toList();
            importUnitRepository.saveAll(importUnitsList);
        }

        return mapTo(product);
    }

    // ================= DELETE =================
    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        // 1. Delete all referencing rows in child tables using native queries
        productRepository.deleteProductUnitsByProductId(id);
        productRepository.deleteCartItemsByProductId(id);
        productRepository.deleteStockReceiptItemsByProductId(id);
        productRepository.deleteOrderItemsByProductId(id);

        // 2. Delete the product itself
        productRepository.delete(product);
    }
    public List<ProductResponseDto> filterProducts(
            Long categoryId,
            Double minPrice,
            Double maxPrice,
            String sortBy,
            String sortDir
    ) {
        List<Product> products;

        // ===== FILTER =====
        if (categoryId != null && minPrice != null && maxPrice != null) {
            products = productRepository.findByCategoryIdAndPriceBetweenAndIsDeletedFalse(
                    categoryId, minPrice, maxPrice);

        } else if (categoryId != null) {
            products = productRepository.findByCategoryIdAndIsDeletedFalse(categoryId);

        } else if (minPrice != null && maxPrice != null) {
            products = productRepository.findByPriceBetweenAndIsDeletedFalse(minPrice, maxPrice);

        } else {
            products = productRepository.findByIsDeletedFalse();
        }

        // ===== SORT =====
        if (sortBy != null) {
            Comparator<Product> comparator;

            switch (sortBy) {
                case "price":
                    comparator = Comparator.comparing(Product::getPrice);
                    break;

                case "name":
                    comparator = Comparator.comparing(Product::getName);
                    break;

                case "rating":
                    comparator = Comparator.comparing(Product::getRating);
                    break;

                default:
                    comparator = Comparator.comparing(Product::getId);
            }

            // sort desc
            if ("desc".equals(sortDir)) {
                comparator = comparator.reversed();
            }

            products.sort(comparator);
        }

        // ===== RETURN =====
        return mapToWithGlobalStock(products);
    }

    public List<ProductResponseDto> getLowStockProducts(Integer threshold) {
        // Warning: getLowStockProducts checks the global product.stock which is legacy.
        // It's better to fetch all and filter by the computed global stock.
        List<Product> products = productRepository.findByIsDeletedFalse();
        return mapToWithGlobalStock(products).stream()
                .filter(dto -> dto.getStock() < threshold)
                .toList();
    }

    public List<ProductResponseDto> getExpiringSoonProducts() {
        return mapToWithGlobalStock(productRepository.findByExpiryDateBeforeAndIsDeletedFalse());
    }

    private ProductResponseDto mapTo(Product product) {
        List<ProductUnitDto> units = productUnitRepository.findByProductId(product.getId())
                .stream()
                .map(u -> ProductUnitDto.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .conversionRate(u.getConversionRate())
                        .price(u.getPrice() != null ? u.getPrice().doubleValue() : 0.0)
                        .oldPrice(u.getOldPrice() != null ? u.getOldPrice().doubleValue() : 0.0)
                        .build())
                .toList();

        List<com.example.demo.dto.product.ImportUnitDto> importUnits = importUnitRepository.findByProductId(product.getId())
                .stream()
                .map(u -> com.example.demo.dto.product.ImportUnitDto.builder()
                        .id(u.getId())
                        .importUnitTypeId(u.getUnitType() != null ? u.getUnitType().getId() : null)
                        .name(u.getUnitType() != null ? u.getUnitType().getName() : null)
                        .conversionRate(u.getConversionRate())
                        .costPrice(u.getCostPrice())
                        .oldCostPrice(u.getOldCostPrice())
                        .build())
                .toList();

        double discountPercent = product.getDiscount() != null ? product.getDiscount() : 0.0;
        units.forEach(u -> {
            double originalPrice = u.getPrice() != null ? u.getPrice() : 0.0;
            u.setOldPrice(originalPrice);
            u.setPrice(originalPrice * (1 - discountPercent / 100.0));
        });
        return ProductResponseDto.builder()
                .id(product.getId())
                .name(product.getName())
                .imageUrl(product.getImageUrl())
                .bg(product.getBg())
                .price(product.getPrice())
                .oldPrice(product.getOldPrice())
                .discount(product.getDiscount())
                .rating(product.getRating())
                .reviews(product.getReviews())
                .tag(product.getTag())
                .unit(product.getUnit())
                .stock(product.getStock())
                .sold(product.getSold())
                .oldBatchQuantity(product.getOldBatchQuantity())
                .newBatchQuantity(product.getNewBatchQuantity())
                .manufactureDate(product.getManufactureDate())
                .expiryDate(product.getExpiryDate())
                .description(product.getDescription())
                .importUnitTypeId(product.getImportUnitType() != null ? product.getImportUnitType().getId() : null)
                .importUnitName(product.getImportUnitType() != null ? product.getImportUnitType().getName() : null)
                .importConversionRate(product.getImportConversionRate())
                .category(product.getCategory() != null ? product.getCategory().getName() : "Không xác định")
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .units(units)
                .importUnits(importUnits)
                .build();
    }
}