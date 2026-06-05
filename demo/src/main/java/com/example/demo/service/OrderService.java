package com.example.demo.service;

import com.example.demo.dto.order.*;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.InvalidOrderStatusTransitionException;
import com.example.demo.repository.*;
import com.example.demo.validator.OrderStatusTransitionValidator;
import com.example.demo.repository.StoreRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderShippingRepository orderShippingRepository;
    private final ShippingService shippingService;
    private final OrderStatusTransitionValidator statusValidator;
    private final NotificationService notificationService;
    private final VoucherService voucherService;
    private final CartRepository cartRepository;
    private final ProductUnitRepository productUnitRepository;
    private final InventoryRepository inventoryRepository;
    private final StoreRepository storeRepository;
    @Value("${order.auto-complete-delay-minutes:1440}")
    private long autoCompleteDelayMinutes;

    private OrderResponseDto mapToDto(Order order) {
        Double shippingFee = order.getShipping() != null ? order.getShipping().getShippingFee() : 0.0;
        Double subtotal = order.getTotalPrice() != null ? order.getTotalPrice() : 0.0;
        Double discount = order.getDiscount() != null ? order.getDiscount() : 0.0;
        Double finalPrice = order.getFinalPrice() != null ? order.getFinalPrice() : (subtotal + shippingFee - discount);

        return OrderResponseDto.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .orderDate(order.getCreatedAt())
                .status(order.getStatus().name())
                .paymentMethod(order.getPayment() != null && order.getPayment().getMethod() != null
                        ? order.getPayment().getMethod().name()
                        : null)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                .userId(order.getUser().getId())
                .customerName(order.getShipping() != null ? order.getShipping().getRecipientName()
                        : order.getUser().getName())
                .customerPhone(order.getShipping() != null ? order.getShipping().getRecipientPhone()
                        : order.getUser().getPhone())
                .shippingAddress(order.getShipping() != null ? order.getShipping().getShippingAddress() : null)
                .shipperId(order.getAssignedShipper() != null ? order.getAssignedShipper().getId() : null)
                .shipperName(order.getAssignedShipper() != null ? order.getAssignedShipper().getName() : null)
                // Keep totalPrice as payable amount for backward compatibility in current
                // frontend.
                .totalPrice(finalPrice)
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(discount)
                .shippingDiscount(order.getShippingDiscount() != null ? order.getShippingDiscount() : 0.0)
                .finalPrice(finalPrice)
                .voucherCode(order.getVoucher() != null ? order.getVoucher().getCode() : null)
                .shippingVoucherCode(order.getShippingVoucher() != null ? order.getShippingVoucher().getCode() : null)
                .starsUsed(order.getStarsUsed())
                .starsAwarded(order.getStarsAwarded())
                .items(order.getItems() != null ? order.getItems().stream()
                        .map(item -> OrderItemResponseDto.builder()
                                .Productid(item.getProduct() != null ? item.getProduct().getId() : null)
                                .productName(item.getProduct() != null ? item.getProduct().getName() : "Sản phẩm đã bị xóa")
                                .quantity(item.getQuantity())
                                .price(item.getPrice())
                                .unit(item.getUnit())
                                .conversionRate(item.getConversionRate())
                                .build())
                        .collect(Collectors.toList()) : null)
                .actualDeliveryTime(order.getActualDeliveryTime())
                .rating(order.getRating())
                .storeId(order.getStore() != null ? order.getStore().getId() : null)
                .build();
    }

    private void validateRequest(OrderRequestDto dto) {
        if (dto == null || dto.getUserId() == null) {
            throw new BadRequestException("Người dùng không hợp lệ");
        }

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new BadRequestException("Đơn hàng phải có ít nhất một sản phẩm");
        }
    }

    private List<OrderItem> buildOrderItems(List<OrderItemRequestDto> itemDtos, Order order, Long storeId) {
        return itemDtos.stream().map(itemDto -> {

            if (itemDto.getProductId() == null) {
                throw new BadRequestException("ID sản phẩm là bắt buộc");
            }

            if (itemDto.getQuantity() == null || itemDto.getQuantity() <= 0) {
                throw new BadRequestException("Số lượng phải lớn hơn 0");
            }

            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm không tồn tại"));

            if (product.getPrice() == null) {
                throw new BadRequestException("Sản phẩm " + product.getName() + " chưa có giá");
            }

            // Legacy rows may contain NULL optimistic-lock version; normalize before update.
            if (product.getVersion() == null) {
                product.setVersion(0L);
            }

            // Calculate actual quantity in base units
            double conversionRate = itemDto.getConversionRate() != null ? itemDto.getConversionRate() : 1.0;
            int quantityToDeduct = (int) (itemDto.getQuantity() * conversionRate);

            if (storeId != null) {
                Inventory inv = inventoryRepository.findByStoreIdAndProductId(storeId, product.getId());
                int availableStoreStock = inv != null && inv.getQuantity() != null ? inv.getQuantity() : 0;
                if (availableStoreStock < quantityToDeduct) {
                    throw new BadRequestException("Sản phẩm " + product.getName() + " không đủ tồn kho tại cửa hàng này (cần " + quantityToDeduct + ", còn " + availableStoreStock + ")");
                }

                if (inv != null && inv.getQuantity() != null) {
                    inv.setQuantity(Math.max(0, inv.getQuantity() - quantityToDeduct));

                    int oldBatch = inv.getOldBatchQuantity() != null ? inv.getOldBatchQuantity() : 0;
                    int newBatch = inv.getNewBatchQuantity() != null ? inv.getNewBatchQuantity() : 0;

                    if (oldBatch >= quantityToDeduct) {
                        inv.setOldBatchQuantity(oldBatch - quantityToDeduct);
                    } else {
                        int remaining = quantityToDeduct - oldBatch;
                        inv.setOldBatchQuantity(0);
                        inv.setNewBatchQuantity(Math.max(0, newBatch - remaining));
                    }
                    inventoryRepository.save(inv);
                }

                // Đồng bộ tồn kho tổng để các màn tổng quan không bị lệch.
                int currentGlobalStock = product.getStock() != null ? product.getStock() : 0;
                product.setStock(Math.max(0, currentGlobalStock - quantityToDeduct));
                productRepository.save(product);
            } else {
                if (product.getStock() == null || product.getStock() < quantityToDeduct) {
                    throw new BadRequestException("Sản phẩm " + product.getName() + " không đủ tồn kho");
                }

                // Also decrement global product stock to keep consistency
                if (product.getStock() == null) product.setStock(0);
                product.setStock(Math.max(0, product.getStock() - quantityToDeduct));
                productRepository.save(product);
            }

            // Calculate base price for unit from DB (treated as Old Price)
            double enteredPrice;
            String targetUnit = itemDto.getUnit() != null ? itemDto.getUnit().trim() : "";

            // Try to find matching unit in product_units
            ProductUnit matchedUnit = productUnitRepository.findByProductId(product.getId())
                    .stream()
                    .filter(u -> u.getName() != null && u.getName().equalsIgnoreCase(targetUnit))
                    .findFirst()
                    .orElse(null);

            if (matchedUnit != null && matchedUnit.getPrice() != null) {
                enteredPrice = matchedUnit.getPrice().doubleValue();
            } else {
                // If not found, use base product price * conversion rate
                enteredPrice = product.getPrice().doubleValue()
                        * (itemDto.getConversionRate() != null ? itemDto.getConversionRate() : 1.0);
            }

            // Apply product discount to the entered price
            double discountPercent = product.getDiscount() != null ? product.getDiscount() : 0.0;
            double finalUnitPrice = enteredPrice * (1 - discountPercent / 100.0);

            return OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .unit(itemDto.getUnit())
                    .conversionRate(itemDto.getConversionRate() != null ? itemDto.getConversionRate() : 1.0)
                    .price(finalUnitPrice * itemDto.getQuantity())
                    .build();

        }).collect(Collectors.toList());
    }

    private double calculateSubtotal(List<OrderItem> items) {
        return items.stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();
    }

    private String resolveShippingAddress(OrderRequestDto dto, User user) {
        if (dto.getShippingAddress() != null && !dto.getShippingAddress().isBlank()) {
            return dto.getShippingAddress();
        }

        if (user.getAddress() != null && !user.getAddress().isBlank()) {
            return user.getAddress();
        }

        if (dto.getProvince() != null && dto.getDistrict() != null && dto.getWard() != null) {
            return String.format("%s, %s, %s, %s",
                    dto.getHouseNumber() != null ? dto.getHouseNumber() : "",
                    dto.getWard(),
                    dto.getDistrict(),
                    dto.getProvince());
        }

        throw new BadRequestException("Thiếu địa chỉ giao hàng");
    }

    private double applyVoucher(Long userId, String voucherCode, double subtotal) {
        if (voucherCode == null || voucherCode.isBlank()) {
            return 0;
        }

        voucherService.validateVoucher(userId, voucherCode, subtotal);
        return voucherService.calculateDiscount(userId, voucherCode, subtotal);
    }

    private Payment createPayment(Order order) {
        return Payment.builder()
                .order(order)
                .method(PaymentMethod.COD)
                .status(PaymentStatus.UNPAID)
                .amount(BigDecimal.valueOf(order.getFinalPrice()))
                .build();
    }

    private void sendNotifications(Order order) {
        try {
            notificationService.sendOrderSuccessNotification(
                    order.getUser(),
                    order.getId(),
                    order.getOrderCode());
        } catch (Exception ex) {
            log.warn("Gửi thông báo đơn hàng thành công thất bại: {}", ex.getMessage());
        }

        try {
            notificationService.sendNewOrderNotificationToAdmins(order);
        } catch (Exception ex) {
            log.warn("Gửi thông báo cho admin thất bại: {}", ex.getMessage());
        }
    }

    private String generateOrderCode() {
        // Avoid collisions when multiple orders are created in the same millisecond.
        return "ORD-" + System.currentTimeMillis() + "-"
                + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    @Transactional
    public OrderResponseDto createOrder(OrderRequestDto dto, String voucherCodeFromParam) {

        validateRequest(dto);

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        // Use voucher code from DTO if not provided in param
        String effectiveVoucherCode = (voucherCodeFromParam != null && !voucherCodeFromParam.isBlank())
                ? voucherCodeFromParam
                : dto.getVoucherCode();

        Order order = Order.builder()
                .user(user)
                .status(OrderStatus.PENDING)
                .orderCode(generateOrderCode())
                .starsUsed(dto.getUseStars() != null ? dto.getUseStars() : 0)
                .build();

        // Associate order with a store if provided
        if (dto.getStoreId() != null) {
            Store s = storeRepository.findById(dto.getStoreId()).orElse(null);
            if (s != null) order.setStore(s);
        }

        if (order.getStarsUsed() != null && order.getStarsUsed() < 0) {
            throw new BadRequestException("Số sao sử dụng không hợp lệ");
        }

        List<OrderItem> items = buildOrderItems(dto.getItems(), order, dto.getStoreId());
        double subtotal = calculateSubtotal(items);
        String shippingAddress = resolveShippingAddress(dto, user);
        double shippingFee;
        // Prefer server-side distance calculation when coordinates provided
        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            Double fee = shippingService.calculateShippingFeeByCoordinates(dto.getLatitude(), dto.getLongitude(), subtotal, dto.getStoreId());
            shippingFee = fee != null ? fee : 0.0;
        } else {
            shippingFee = shippingService.calculateShippingFee(shippingAddress, subtotal);
        }

        // Apply product voucher
        double voucherDiscount = applyVoucher(dto.getUserId(), effectiveVoucherCode, subtotal);
        if (effectiveVoucherCode != null && !effectiveVoucherCode.isBlank()) {
            order.setVoucher(voucherService.getVoucherByCode(effectiveVoucherCode));
            voucherService.markVoucherAsUsed(user, effectiveVoucherCode);
        }

        // Apply shipping voucher
        double shippingDiscount = 0;
        if (dto.getShippingVoucherCode() != null && !dto.getShippingVoucherCode().isBlank()) {
            shippingDiscount = voucherService.calculateDiscount(user.getId(), dto.getShippingVoucherCode(), shippingFee);
            voucherService.markVoucherAsUsed(user, dto.getShippingVoucherCode());
        }

        // Apply Stars discount (1 star = 1000 VND)
        double starDiscount = (order.getStarsUsed() != null) ? order.getStarsUsed() * 1000.0 : 0.0;

        // Guard: stars cannot exceed payable amount after vouchers (before shipping voucher).
        double payableBeforeShippingVoucher = Math.max(0.0, (subtotal + shippingFee) - (voucherDiscount + shippingDiscount));
        int maxStarsByAmount = (int) Math.floor(payableBeforeShippingVoucher / 1000.0);
        if (order.getStarsUsed() != null && order.getStarsUsed() > maxStarsByAmount) {
            throw new BadRequestException("Số sao vượt quá giá trị đơn hàng có thể áp dụng");
        }

        // Deduct stars from user
        if (order.getStarsUsed() != null && order.getStarsUsed() > 0) {
            int userStars = user.getRewardStars() != null ? user.getRewardStars() : 0;
            if (userStars < order.getStarsUsed()) {
                throw new BadRequestException("Bạn không đủ sao để sử dụng");
            }
            user.setRewardStars(userStars - order.getStarsUsed());
            userRepository.save(user);
        }

        OrderShipping shipping = OrderShipping.builder()
                .order(order)
                .shippingAddress(shippingAddress)
                .shippingFee(shippingFee)
                .shippingDiscount(shippingDiscount)
                .recipientName(dto.getRecipientName() != null ? dto.getRecipientName() : user.getName())
                .recipientPhone(dto.getRecipientPhone() != null ? dto.getRecipientPhone() : user.getPhone())
                .build();

        order.setItems(items);
        order.setShipping(shipping);
        order.setTotalPrice(subtotal);

        order.setShippingDiscount(shippingDiscount);
        if (dto.getShippingVoucherCode() != null && !dto.getShippingVoucherCode().isBlank()) {
            order.setShippingVoucher(voucherService.getVoucherByCode(dto.getShippingVoucherCode()));
        }

        // Total discount includes voucher and stars
        double totalDiscount = voucherDiscount + starDiscount;
        order.setDiscount(totalDiscount);

        double finalPrice = (subtotal + shippingFee) - (totalDiscount + shippingDiscount);
        if (finalPrice < 0)
            finalPrice = 0.0;
        order.setFinalPrice(finalPrice);

        // Reward stars (1 star for every 100,000 VND spent)
        int starsAwarded = (int) (finalPrice / 100000);
        order.setStarsAwarded(starsAwarded);

        Payment payment = createPayment(order);
        order.setPayment(payment);

        orderRepository.save(order);

        // Clean up cart
        List<Long> orderedProductIds = items.stream()
                .map(i -> i.getProduct() != null ? i.getProduct().getId() : null)
                .filter(java.util.Objects::nonNull)
                .toList();

        Cart cart = cartRepository.findByUserId(dto.getUserId());
        if (cart != null && cart.getItems() != null) {
            cart.getItems().removeIf(item -> item.getProduct() != null &&
                    orderedProductIds.contains(item.getProduct().getId()));
            cartRepository.save(cart);
        }

        sendNotifications(order);

        return mapToDto(order);
    }

    public List<OrderResponseDto> getAllOrders() {
        return orderRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")).stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    public List<OrderResponseDto> getOrdersByStoreId(Long storeId) {
        return orderRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    public List<OrderResponseDto> getAssignedOrdersForShipper(Long shipperId) {
        User shipper = userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipper không tồn tại"));
        if (shipper.getRole() != Role.SHIPPER) {
            throw new BadRequestException("Người dùng này không phải shipper");
        }

        return orderRepository.findByAssignedShipperIdOrderByCreatedAtDesc(shipperId).stream()
                .map(this::mapToDto)
                .toList();
    }

    public OrderResponseDto getAssignedOrderDetailForShipper(Long shipperId, Long orderId) {
        User shipper = userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipper không tồn tại"));
        if (shipper.getRole() != Role.SHIPPER) {
            throw new BadRequestException("Người dùng này không phải shipper");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);
        return mapToDto(order);
    }

    public OrderResponseDto getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        return mapToDto(order);
    }

    public List<OrderResponseDto> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Calculate order totals without persisting or mutating database state.
     * Used for frontend preview so displayed amounts match server-side logic.
     */
    public OrderResponseDto previewOrder(OrderRequestDto dto, String voucherCodeFromParam) {
        validateRequest(dto);

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        String effectiveVoucherCode = (voucherCodeFromParam != null && !voucherCodeFromParam.isBlank())
                ? voucherCodeFromParam
                : dto.getVoucherCode();

        // Build items (read-only calculation)
        double subtotal = 0.0;
        List<OrderItem> calcItems = dto.getItems().stream().map(itemDto -> {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm không tồn tại"));

            double conversionRate = itemDto.getConversionRate() != null ? itemDto.getConversionRate() : 1.0;
            // Determine unit price (do not modify DB)
            ProductUnit matchedUnit = productUnitRepository.findByProductId(product.getId())
                    .stream()
                    .filter(u -> u.getName() != null && u.getName().equalsIgnoreCase(itemDto.getUnit()))
                    .findFirst()
                    .orElse(null);

            double enteredPrice;
            if (matchedUnit != null && matchedUnit.getPrice() != null) {
                enteredPrice = matchedUnit.getPrice().doubleValue();
            } else {
                enteredPrice = product.getPrice() != null ? product.getPrice().doubleValue() * conversionRate : 0.0;
            }

            double discountPercent = product.getDiscount() != null ? product.getDiscount() : 0.0;
            double finalUnitPrice = enteredPrice * (1 - discountPercent / 100.0);

            OrderItem oi = OrderItem.builder()
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .unit(itemDto.getUnit())
                    .conversionRate(conversionRate)
                    .price(finalUnitPrice * itemDto.getQuantity())
                    .build();

            return oi;
        }).collect(Collectors.toList());

        subtotal = calcItems.stream().mapToDouble(OrderItem::getPrice).sum();

        // Shipping fee calculation (server-side authoritative)
        double shippingFee;
        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            Double fee = shippingService.calculateShippingFeeByCoordinates(dto.getLatitude(), dto.getLongitude(), subtotal, dto.getStoreId());
            shippingFee = fee != null ? fee : 0.0;
        } else {
            String shippingAddress = dto.getShippingAddress();
            if (shippingAddress == null || shippingAddress.isBlank()) {
                shippingAddress = resolveShippingAddress(dto, user);
            }
            shippingFee = shippingService.calculateShippingFee(shippingAddress, subtotal);
        }

        // Voucher discounts (read-only validation and calc)
        double voucherDiscount = 0.0;
        if (effectiveVoucherCode != null && !effectiveVoucherCode.isBlank()) {
            voucherService.validateVoucher(dto.getUserId(), effectiveVoucherCode, subtotal);
            voucherDiscount = voucherService.calculateDiscount(dto.getUserId(), effectiveVoucherCode, subtotal);
        }

        double shippingDiscount = 0.0;
        if (dto.getShippingVoucherCode() != null && !dto.getShippingVoucherCode().isBlank()) {
            voucherService.validateVoucher(dto.getUserId(), dto.getShippingVoucherCode(), shippingFee);
            shippingDiscount = voucherService.calculateDiscount(dto.getUserId(), dto.getShippingVoucherCode(), shippingFee);
        }

        // Stars calculation (do not mutate user's stars)
        int starsToUse = dto.getUseStars() != null ? dto.getUseStars() : 0;
        double starDiscount = starsToUse * 1000.0;

        double payableBeforeShippingVoucher = Math.max(0.0, (subtotal + shippingFee) - (voucherDiscount + shippingDiscount));
        int maxStarsByAmount = (int) Math.floor(payableBeforeShippingVoucher / 1000.0);
        if (starsToUse > maxStarsByAmount) {
            starsToUse = maxStarsByAmount;
            starDiscount = starsToUse * 1000.0;
        }
        int userStars = user.getRewardStars() != null ? user.getRewardStars() : 0;
        if (starsToUse > userStars) {
            starsToUse = userStars;
            starDiscount = starsToUse * 1000.0;
        }

        double totalDiscount = voucherDiscount + starDiscount;

        double finalPrice = (subtotal + shippingFee) - (totalDiscount + shippingDiscount);
        if (finalPrice < 0) finalPrice = 0.0;

        return OrderResponseDto.builder()
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(totalDiscount)
                .shippingDiscount(shippingDiscount)
                .finalPrice(finalPrice)
                .totalPrice(finalPrice)
                .items(calcItems.stream().map(i -> {
                    return com.example.demo.dto.order.OrderItemResponseDto.builder()
                            .Productid(i.getProduct() != null ? i.getProduct().getId() : null)
                            .productName(i.getProduct() != null ? i.getProduct().getName() : "Sản phẩm đã bị xóa")
                            .quantity(i.getQuantity())
                            .price(i.getPrice())
                            .unit(i.getUnit())
                            .conversionRate(i.getConversionRate())
                            .build();
                }).collect(Collectors.toList()))
                .starsUsed(starsToUse)
                .build();
    }

    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CANCELLED) {
            throw new BadRequestException("Chỉ có thể xóa đơn hàng đang chờ hoặc đã hủy");
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }

    @Transactional // khi payment sai thì order nó sẽ cập nhật lại trogn data

    public OrderResponseDto updateStatus(Long orderId, OrderStatus newStatus) {
        return transitionStatus(orderId, newStatus);
    }

    @Transactional
    public OrderResponseDto updateStatus(Long orderId, OrderStatus newStatus, Integer rating) {
        if (newStatus == OrderStatus.COMPLETED && rating != null) {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
            order.setRating(rating);
            orderRepository.save(order);
        }
        return transitionStatus(orderId, newStatus);
    }

    @Transactional
    public OrderResponseDto transitionStatus(Long orderId, OrderStatus newStatus) {
        return transitionStatus(orderId, newStatus, false);
    }

    @Transactional
    public OrderResponseDto transitionStatus(Long orderId, OrderStatus newStatus, boolean allowOperatorCancelInShipping) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        OrderStatus currentStatus = order.getStatus();
        if (newStatus == null) {
            throw new BadRequestException("Trạng thái mới không được để trống");
        }

        // Kiểm tra xem có thể chuyển hay không (State Machine Validation)
        try {
            statusValidator.validate(order, newStatus, allowOperatorCancelInShipping);
        } catch (InvalidOrderStatusTransitionException e) {
            throw new BadRequestException(e.getMessage());
        }

        log.info("Cập nhật trạng thái order {} từ {} sang {}",
                orderId, currentStatus.name(), newStatus.name());

        order.setStatus(newStatus);

        // Xử lý các tác dụng phụ khi chuyển trạng thái
        handleStatusTransitionSideEffects(order, currentStatus, newStatus);

        orderRepository.save(order);
        try {
            notificationService.sendOrderStatusUpdateToCustomer(order, currentStatus, newStatus);
        } catch (Throwable ex) {
            log.warn("Failed to notify customer for order {} status update: {}", order.getOrderCode(), ex.getMessage());
        }
        return mapToDto(order);
    }

    @Transactional
    public OrderResponseDto confirmCodOrderToPacking(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        if (order.getPayment() == null) {
            throw new BadRequestException("Đơn hàng chưa có thông tin thanh toán");
        }
        if (order.getPayment().getMethod() != PaymentMethod.COD) {
            throw new BadRequestException("Chỉ áp dụng cho đơn thanh toán COD");
        }
        if (order.getStatus() == OrderStatus.PENDING) {
            transitionStatus(orderId, OrderStatus.CONFIRMED);
        }
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BadRequestException("Đơn hàng phải ở trạng thái CONFIRMED để chuyển sang PACKING");
        }
        return transitionStatus(orderId, OrderStatus.PACKING);
    }

    @Transactional // gán đơn hàng cho shipper
    public OrderResponseDto assignShipper(Long orderId, Long shipperId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        User shipper = userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipper không tồn tại"));
        if (shipper.getRole() != Role.SHIPPER) {
            throw new BadRequestException("Người được gán không phải shipper");
        }

        if (order.getStatus() != OrderStatus.PACKING
                && order.getStatus() != OrderStatus.CONFIRMED
                && order.getStatus() != OrderStatus.SHIPPING) {
            throw new BadRequestException("Chỉ có thể gán shipper cho đơn đang chuẩn bị");
        }

        order.setAssignedShipper(shipper);
        orderRepository.save(order);
        try {
            notificationService.sendOrderAssignedShipperToCustomer(order);
        } catch (Throwable ex) {
            log.warn("Gửi thông báo cho khách hàng về việc gán shipper thất bại cho đơn {}: {}", order.getOrderCode(),
                    ex.getMessage());
        }
        try {
            notificationService.sendOrderAssignedToShipper(order);
        } catch (Throwable ex) {
            log.warn("Gửi thông báo cho shipper về đơn được gán thất bại {}: {}", order.getOrderCode(),
                    ex.getMessage());
        }
        return mapToDto(order);
    }

    @Transactional
    public OrderResponseDto shipperAcceptOrder(Long orderId, Long shipperId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);

        if (order.getStatus() == OrderStatus.CONFIRMED) {
            transitionStatus(orderId, OrderStatus.PACKING);
        }
        return transitionStatus(orderId, OrderStatus.SHIPPING);
    }

    @Transactional
    public OrderResponseDto shipperMarkDelivered(Long orderId, Long shipperId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);
        return transitionStatus(orderId, OrderStatus.DELIVERED);
    }

    @Transactional
    public OrderResponseDto shipperMarkDeliveryFailed(Long orderId, Long shipperId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);

        if (order.getStatus() != OrderStatus.SHIPPING) {
            throw new BadRequestException("Chỉ có thể báo không giao được khi đơn đang ở trạng thái SHIPPING");
        }

        String failReason = (reason == null || reason.isBlank())
                ? "Khong giao duoc hang"
                : reason.trim();
        order.setNotes((order.getNotes() != null ? order.getNotes() + "\n" : "") + "Shipper bao khong giao duoc: "
                + failReason);

        return transitionStatus(orderId, OrderStatus.RETURN_AWAITING_ADMIN_CONFIRM, true);
    }

    @Transactional
    public OrderResponseDto shipperPickUpReturn(Long orderId, Long shipperId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);

        if (order.getStatus() != OrderStatus.RETURN_REQUESTED) {
            throw new BadRequestException("Chỉ có thể xác nhận lấy hàng khi đơn ở trạng thái yêu cầu hoàn");
        }

        return transitionStatus(orderId, OrderStatus.RETURN_PICKING);
    }

    @Transactional
    public OrderResponseDto shipperConfirmReturnedToWarehouse(Long orderId, Long shipperId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));
        ensureAssignedToShipper(order, shipperId);

        if (order.getStatus() != OrderStatus.RETURN_PICKING) {
            throw new BadRequestException("Chỉ có thể xác nhận hoàn về kho khi đơn ở trạng thái đang lấy hàng hoàn");
        }

        return transitionStatus(orderId, OrderStatus.RETURN_AWAITING_ADMIN_CONFIRM);
    }

    private void handleStatusTransitionSideEffects(Order order, OrderStatus currentStatus, OrderStatus newStatus) {
        switch (newStatus) {
            case PAID:
                order.setPaymentStatus(PaymentStatus.PAID);
                log.info("Thanh toán thành công cho order {}", order.getOrderCode());
                break;

            case CONFIRMED:
                log.info("Xác nhận order {}", order.getOrderCode());
                break;

            case PACKING:
                log.info("Bắt đầu đóng gói order {}", order.getOrderCode());
                break;

            case SHIPPING:
                order.setEstimatedDeliveryTime(LocalDateTime.now().plusDays(3));
                log.info("Bắt đầu giao order {}", order.getOrderCode());
                break;

            case DELIVERED:
                order.setActualDeliveryTime(LocalDateTime.now());
                if (order.getPayment() != null
                        && order.getPayment().getMethod() == PaymentMethod.COD
                        && order.getPaymentStatus() != PaymentStatus.PAID) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                    order.getPayment().setStatus(PaymentStatus.PAID);
                    order.getPayment().setPaidAt(LocalDateTime.now());
                    order.getPayment().setFailureReason(null);
                }
                log.info("Giao hàng thành công order {}", order.getOrderCode());
                break;

            case COMPLETED:
                if (currentStatus == OrderStatus.DELIVERED) {
                    if (order.getStarsAwarded() != null && order.getStarsAwarded() > 0) {
                        User customer = order.getUser();
                        int currentStars = customer.getRewardStars() != null ? customer.getRewardStars() : 0;
                        customer.setRewardStars(currentStars + order.getStarsAwarded());
                        userRepository.save(customer);
                        log.info("Đã tặng {} sao cho người dùng {}", order.getStarsAwarded(), customer.getEmail());
                    }
                    // Increase Sold Count
                    updateSoldCount(order, true);
                    // Update Product Ratings
                    updateProductRatings(order);
                } else {
                    log.info("Khôi phục đơn hàng {} về COMPLETED từ {}", order.getOrderCode(), currentStatus);
                }
                log.info("Hoàn thành order {}", order.getOrderCode());
                break;

            case CANCELLED:
                handleOrderCancellation(order);
                break;

            case RETURN_REQUESTED:
                log.info("Yêu cầu hoàn trả đơn hàng {}", order.getOrderCode());
                break;

            case RETURN_PICKING:
                log.info("Shipper đang lấy hàng hoàn cho đơn hàng {}", order.getOrderCode());
                break;

            case RETURN_AWAITING_ADMIN_CONFIRM:
                log.info("Shipper đã báo trả hàng cho đơn {}. Chờ quản trị xác nhận hàng về kho", order.getOrderCode());
                break;

            case RETURNED_TO_WAREHOUSE:
                log.info("Shipper đã giao đơn hàng {} về kho, chờ quản trị xác nhận", order.getOrderCode());
                break;

            case RETURNED:
                order.setPaymentStatus(PaymentStatus.REFUNDED);
                // Restock items
                handleRestocking(order);
                // Restore used vouchers back to user
                restoreVoucherForUser(order);
                // Restore stars user spent at checkout (if any)
                if (order.getStarsUsed() != null && order.getStarsUsed() > 0) {
                    User customer = order.getUser();
                    if (customer != null) {
                        int currentStars = customer.getRewardStars() != null ? customer.getRewardStars() : 0;
                        customer.setRewardStars(currentStars + order.getStarsUsed());
                        userRepository.save(customer);
                        log.info("Hoàn lại {} sao đã dùng cho người dùng {} ở đơn {}", order.getStarsUsed(), customer.getEmail(), order.getOrderCode());
                    }
                }
                // Refund in Stars if paid via Bank/PayOS
                handleRefundInStars(order);
                // Decrease Sold Count if it was previously COMPLETED
                updateSoldCount(order, false);
                log.info("Hoàn trả thành công order {}", order.getOrderCode());
                break;

            default:
                break;
        }
    }

    private void handleOrderCancellation(Order order) {
        // Trả lại tồn kho
        handleRestocking(order);

        // Hoàn lại voucher cho người dùng (đặt lại trạng thái chưa sử dụng)
        restoreVoucherForUser(order);

        // Hoàn lại sao nếu người dùng đã dùng sao
        if (order.getStarsUsed() != null && order.getStarsUsed() > 0) {
            User customer = order.getUser();
            if (customer != null) {
                int currentStars = customer.getRewardStars() != null ? customer.getRewardStars() : 0;
                customer.setRewardStars(currentStars + order.getStarsUsed());
                userRepository.save(customer);
                log.info("Hoàn lại {} sao cho người dùng {} do hủy đơn {}", order.getStarsUsed(), customer.getEmail(), order.getOrderCode());
            }
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.REFUNDED);
            // Refund in Stars if paid via Bank/PayOS
            handleRefundInStars(order);
            log.info("Hoàn tiền (Sao) cho order {} do hủy đơn", order.getOrderCode());
        }

        log.info("Đã hủy order {}", order.getOrderCode());
    }

    private void restoreVoucherForUser(Order order) {
        User user = order.getUser();
        if (user == null) return;

        // Hoàn lại product voucher
        if (order.getVoucher() != null) {
            String voucherCode = order.getVoucher().getCode();
            voucherService.markVoucherAsUnused(user, voucherCode);
            log.info("Đã hoàn lại voucher {} cho người dùng {} do hủy đơn {}", voucherCode, user.getEmail(), order.getOrderCode());
        }

        // Hoàn lại shipping voucher
        if (order.getShippingVoucher() != null) {
            String svCode = order.getShippingVoucher().getCode();
            voucherService.markVoucherAsUnused(user, svCode);
            log.info("Đã hoàn lại shipping voucher {} cho người dùng {} do hủy đơn {}", svCode, user.getEmail(), order.getOrderCode());
        }
    }

    private void handleRestocking(Order order) {
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                if (product != null) {
                    double conversionRate = (item.getConversionRate() != null) ? item.getConversionRate() : 1.0;
                    int quantityInBaseUnit = (int) ((item.getQuantity() != null ? item.getQuantity() : 0)
                            * conversionRate);

                    product.setStock((product.getStock() != null ? product.getStock() : 0) + quantityInBaseUnit);
                    product.setNewBatchQuantity(
                            (product.getNewBatchQuantity() != null ? product.getNewBatchQuantity() : 0)
                                    + quantityInBaseUnit);
                    productRepository.save(product);
                }
            }
        }
    }

    private void handleRefundInStars(Order order) {
        Payment payment = order.getPayment();
        if (payment != null) {

            User user = order.getUser();
            if (user != null) {
                // 1 Star = 1000 VND. Refund the final price paid.
                double finalPrice = (order.getFinalPrice() != null) ? order.getFinalPrice() : 0.0;
                int starsToRefund = (int) (finalPrice / 1000);

                int currentStars = (user.getRewardStars() != null) ? user.getRewardStars() : 0;
                user.setRewardStars(currentStars + starsToRefund);
                userRepository.save(user);
                log.info("Đã hoàn {} sao cho người dùng {} cho đơn hàng {}", starsToRefund, user.getEmail(),
                        order.getOrderCode());
            }
        }
    }

    private void updateSoldCount(Order order, boolean isIncrease) {
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                if (product != null) {
                    double conversionRate = item.getConversionRate() != null ? item.getConversionRate() : 1.0;
                    int delta = (int) (item.getQuantity() * conversionRate);
                    int currentSold = product.getSold() != null ? product.getSold() : 0;

                    if (isIncrease) {
                        product.setSold(currentSold + delta);
                    } else {
                        product.setSold(Math.max(0, currentSold - delta));
                    }
                    productRepository.save(product);
                }
            }
        }
    }

    private void updateProductRatings(Order order) {
        if (order.getRating() == null || order.getItems() == null) {
            return;
        }
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            if (product != null) {
                double currentRating = product.getRating() != null ? product.getRating() : 0.0;
                int currentReviews = product.getReviews() != null ? product.getReviews() : 0;

                double newRating = (currentRating * currentReviews + order.getRating()) / (currentReviews + 1);
                // Làm tròn đến 1 chữ số thập phân (ví dụ: 4.8)
                newRating = Math.round(newRating * 10.0) / 10.0;

                product.setRating(newRating);
                product.setReviews(currentReviews + 1);
                productRepository.save(product);

                log.info("Đã cập nhật rating cho sản phẩm {}: {} sao dựa trên {} lượt đánh giá",
                        product.getName(), newRating, currentReviews + 1);
            }
        }
    }

    @Transactional
    public OrderResponseDto cancelOrder(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        boolean isAdmin = order.getUser().getRole() == Role.SUPER_ADMIN || order.getUser().getRole() == Role.STORE_ADMIN;
        try {
            statusValidator.validateCancel(order, isAdmin, false);
        } catch (InvalidOrderStatusTransitionException e) {
            throw new BadRequestException(e.getMessage());
        }

        order.setNotes((order.getNotes() != null ? order.getNotes() + "\n" : "") + "Lý do hủy: " + reason);
        return transitionStatus(orderId, OrderStatus.CANCELLED);
    }

    @Transactional
    public OrderResponseDto requestReturn(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        try {
            statusValidator.validateReturnRequest(order);
        } catch (InvalidOrderStatusTransitionException e) {
            throw new BadRequestException(e.getMessage());
        }

        order.setNotes((order.getNotes() != null ? order.getNotes() + "\n" : "") + "Lý do hoàn trả: " + reason);
        return transitionStatus(orderId, OrderStatus.RETURN_REQUESTED);
    }

    @Transactional
    public OrderShipping createOrUpdateShipping(Long orderId, String shippingAddress) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        OrderShipping shipping = order.getShipping();
        if (shipping == null) {
            shipping = OrderShipping.builder()
                    .order(order)
                    .shippingAddress(shippingAddress)
                    .build();
        } else {
            shipping.setShippingAddress(shippingAddress);
        }

        Double fee = shippingService.calculateShippingFee(shippingAddress, order.getTotalPrice());
        shipping.setShippingFee(fee);
        order.calculateFinalPrice();

        order.setShipping(orderShippingRepository.save(shipping));
        orderRepository.save(order);
        return order.getShipping();
    }

    public OrderLifecycleResponseDto getLifecycle(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        List<String> allowed = order.getStatus()
                .getValidTransitions()
                .stream()
                .map(Enum::name)
                .toList();

        return OrderLifecycleResponseDto.builder()
                .orderId(order.getId())
                .currentStatus(order.getStatus().name())
                .allowedNextStatuses(allowed)
                .build();
    }

    private void ensureAssignedToShipper(Order order, Long shipperId) {
        if (order.getAssignedShipper() == null) {
            throw new BadRequestException("Đơn hàng chưa được gán shipper");
        }
        if (!order.getAssignedShipper().getId().equals(shipperId)) {
            throw new BadRequestException("Shipper không có quyền thao tác đơn này");
        }
    }

    @Transactional
    public OrderResponseDto completeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        if (order.getUser() == null || order.getUser().getId() == null) {
            throw new BadRequestException("Đơn hàng không có thông tin người dùng");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể hoàn thành đơn hàng đã giao");
        }

        return transitionStatus(orderId, OrderStatus.COMPLETED);
    }

    @Scheduled(fixedDelayString = "${order.auto-complete-check-ms:60000}")
    @Transactional
    public void autoCompleteDeliveredOrders() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(autoCompleteDelayMinutes);
        List<Order> deliveredOrders = orderRepository.findByStatusAndActualDeliveryTimeBefore(
                OrderStatus.DELIVERED,
                threshold);

        for (Order order : deliveredOrders) {
            if (order.getStatus() != OrderStatus.DELIVERED) {
                continue;
            }

            OrderStatus fromStatus = order.getStatus();
            order.setStatus(OrderStatus.COMPLETED);
            handleStatusTransitionSideEffects(order, OrderStatus.DELIVERED, OrderStatus.COMPLETED);
            orderRepository.save(order);
            try {
                notificationService.sendOrderStatusUpdateToCustomer(order, fromStatus, OrderStatus.COMPLETED);
            } catch (Throwable ex) {
                log.warn("Gửi thông báo tự động hoàn thành đơn thất bại cho đơn {}: {}", order.getOrderCode(),
                        ex.getMessage());
            }
        }
    }

    public Double calculateShippingFee(String address, Double subtotal) {
        return shippingService.calculateShippingFee(address, subtotal);
    }
}
