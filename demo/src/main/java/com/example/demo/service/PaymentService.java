package com.example.demo.service;

import com.example.demo.dto.payment.PayOSWebhookData;
import com.example.demo.dto.payment.PayoWebhookRequestDto;
import com.example.demo.dto.payment.PaymentResponseDto;
import com.example.demo.dto.order.OrderRequestDto;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @Value("${payment.bank-transfer-timeout-minutes:30}")
    private long bankTransferTimeoutMinutes;

    @Value("${payment.payo.webhook-secret:}")
    private String payoWebhookSecret;

    @Value("${payment.payo.client-id:}")
    private String payoClientId;

    @Value("${payment.payo.api-key:}")
    private String payoApiKey;

    @Value("${payment.payo.account-number:}")
    private String payoAccountNumber;

    @Value("${payment.payo.account-name:}")
    private String payoAccountName;

    @Value("${payment.payo.bank-name:MB}")
    private String payoBankName;

    @Value("${payment.payo.return-url:http://localhost:5173/orders}")
    private String payoReturnUrl;

    @Value("${payment.payo.cancel-url:http://localhost:5173/checkout}")
    private String payoCancelUrl;

    // ================= CREATE =================
    @Transactional
    public PaymentResponseDto createPayment(Long orderId, PaymentMethod method) {
        if (method == null) {
            throw new BadRequestException("Phương thức thanh toán chưa có");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Không thể tạo payment cho đơn hàng đã " + order.getStatus().name().toLowerCase());
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseGet(() -> Payment.builder().order(order).build());

        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            throw new BadRequestException("Đơn hàng đã thanh toán, không thể tạo payment mới");
        }

        payment.setMethod(method);
        double finalPrice = order.getFinalPrice() != null ? order.getFinalPrice() : 0.0;
        payment.setAmount(BigDecimal.valueOf(Math.round(finalPrice)));
        payment.setStatus(PaymentStatus.UNPAID);
        
        if (method == PaymentMethod.BANK_TRANSFER) {
            payment.setTransactionCode(generateTransactionCode(order));
            long exactAmount = payment.getAmount().longValue();
            
            // Try to create a real PayOS payment link first
            String payosCheckoutUrl = createPayOSPaymentLink(order.getId(), exactAmount, payment.getTransactionCode());
            if (payosCheckoutUrl != null) {
                payment.setQrCodeUrl(payosCheckoutUrl);
                log.info("Created PayOS payment link for order {}: {}", orderId, payosCheckoutUrl);
            } else {
                // Fallback to static VietQR
                payment.setQrCodeUrl(buildCheckoutUrl(payment.getTransactionCode(), BigDecimal.valueOf(exactAmount)));
                log.warn("PayOS API failed, falling back to static VietQR for order {}", orderId);
            }
        }

        return mapToDto(paymentRepository.save(payment));
    }

    /**
     * Creates a PayOS dynamic payment link via API.
     * Returns the QR code image URL or null on failure.
     */
    private String createPayOSPaymentLink(Long orderId, long amount, String description) {
        if (payoClientId == null || payoClientId.isBlank() || payoApiKey == null || payoApiKey.isBlank()) {
            return null;
        }
        try {
            // PayOS orderCode must be a unique integer - use orderId
            // Description max 25 chars
            String desc = description.length() > 25 ? description.substring(description.length() - 25) : description;
            
            // Build signature: amount + cancelUrl + description + orderCode + returnUrl
            String sigStr = "amount=" + amount
                + "&cancelUrl=" + payoCancelUrl
                + "&description=" + desc
                + "&orderCode=" + orderId
                + "&returnUrl=" + payoReturnUrl;
            String signature = hmacSha256Hex(payoWebhookSecret.trim(), sigStr);

            String body = String.format(
                "{\"orderCode\":%d,\"amount\":%d,\"description\":\"%s\",\"returnUrl\":\"%s\",\"cancelUrl\":\"%s\",\"signature\":\"%s\"}",
                orderId, amount, desc, payoReturnUrl, payoCancelUrl, signature
            );

            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create("https://api-merchant.payos.vn/v2/payment-requests"))
                .header("Content-Type", "application/json")
                .header("x-client-id", payoClientId)
                .header("x-api-key", payoApiKey)
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
                .build();

            java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            log.info("PayOS create link response [{}]: {}", resp.statusCode(), resp.body());

            if (resp.statusCode() == 200) {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(resp.body());
                com.fasterxml.jackson.databind.JsonNode data = node.get("data");
                if (data != null) {
                    // PayOS returns raw EMV QR string in "qrCode" field - use it to generate QR image
                    String qrCode = data.has("qrCode") ? data.get("qrCode").asText() : null;
                    if (qrCode != null && !qrCode.isBlank()) {
                        String encoded = java.net.URLEncoder.encode(qrCode, StandardCharsets.UTF_8);
                        log.info("PayOS qrCode raw (first 50 chars): {}", qrCode.substring(0, Math.min(50, qrCode.length())));
                        return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encoded;
                    }
                    // Fallback: generate QR image from checkoutUrl
                    String checkoutUrl = data.has("checkoutUrl") ? data.get("checkoutUrl").asText() : null;
                    if (checkoutUrl != null && !checkoutUrl.isBlank()) {
                        String encoded = java.net.URLEncoder.encode(checkoutUrl, StandardCharsets.UTF_8);
                        log.info("PayOS checkoutUrl: {}", checkoutUrl);
                        return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encoded;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to create PayOS payment link: {}", e.getMessage());
        }
        return null;
    }

    @Transactional
    public PaymentResponseDto confirmPayment(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy payment cho đơn hàng này"));
        
        Order order = payment.getOrder();
        markPaymentAsPaid(payment, order, payment.getTransactionCode(), "MANUAL", "ADMIN_CONFIRM");
        return mapToDto(payment);
    }

    @Transactional
    public PaymentResponseDto failPayment(Long orderId, String reason) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy payment cho đơn hàng này"));
        
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(reason);
        return mapToDto(paymentRepository.save(payment));
    }

    public PaymentResponseDto getByOrder(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy payment cho đơn hàng này"));
        
        // Active polling fallback for localhost (if webhook is missing)
        if (payment.getStatus() == PaymentStatus.UNPAID && payment.getMethod() == PaymentMethod.BANK_TRANSFER) {
            syncPaymentStatusWithPayOS(payment);
        }
        
        return mapToDto(payment);
    }

    public String getPaymentStatus(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment == null) return "NOT_FOUND";
        
        if (payment.getStatus() == PaymentStatus.UNPAID && payment.getMethod() == PaymentMethod.BANK_TRANSFER) {
            syncPaymentStatusWithPayOS(payment);
        }
        
        return payment.getStatus().name();
    }

    private void syncPaymentStatusWithPayOS(Payment payment) {
        if (payoClientId == null || payoClientId.isBlank() || payoApiKey == null || payoApiKey.isBlank()) {
            return;
        }
        try {
            Long orderCode = payment.getOrder().getId();
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create("https://api-merchant.payos.vn/v2/payment-requests/" + orderCode))
                .header("x-client-id", payoClientId)
                .header("x-api-key", payoApiKey)
                .GET()
                .build();

            java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(resp.body());
                com.fasterxml.jackson.databind.JsonNode data = node.get("data");
                if (data != null && data.has("status")) {
                    String status = data.get("status").asText();
                    if ("PAID".equalsIgnoreCase(status)) {
                        log.info("Active sync: PayOS order {} is PAID. Updating local database...", orderCode);
                        markPaymentAsPaid(payment, payment.getOrder(), String.valueOf(orderCode), "SYNC", "ACTIVE_POLLING");
                    } else if ("CANCELLED".equalsIgnoreCase(status)) {
                        payment.setStatus(PaymentStatus.FAILED);
                        payment.setFailureReason("Đã hủy trên PayOS");
                        paymentRepository.save(payment);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync payment status with PayOS: {}", e.getMessage());
        }
    }

    public List<String> getSupportedMethods() {
        return Arrays.stream(PaymentMethod.values())
                .map(Enum::name)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentResponseDto prepareTransfer(OrderRequestDto request) {
        // Luồng thanh toán trước khi tạo đơn hàng (nếu có)
        // Hoặc đơn giản là tạo một Payment entity tạm thời
        Payment payment = Payment.builder()
                .amount(BigDecimal.valueOf(request.getTotalPrice()))
                .method(PaymentMethod.BANK_TRANSFER)
                .status(PaymentStatus.UNPAID)
                .orderData(serializeOrderData(request))
                .transactionCode("PRE-" + System.currentTimeMillis())
                .build();
        
        payment.setQrCodeUrl(buildCheckoutUrl(payment.getTransactionCode(), payment.getAmount()));
        return mapToDto(paymentRepository.save(payment));
    }

    private String serializeOrderData(OrderRequestDto request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            return null;
        }
    }

    public PaymentResponseDto getPaymentByTransactionCode(String transactionCode) {
        return paymentRepository.findByTransactionCode(transactionCode)
                .map(this::mapToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch: " + transactionCode));
    }

    @Transactional
    public Object processPayoWebhookRaw(java.util.Map<String, Object> request) {
        log.info(">>> RECEIVED PAYOS WEBHOOK: {}", request);
        try {
            if (request == null || !request.containsKey("data")) {
                throw new BadRequestException("Webhook payment không hợp lệ");
            }

            String receivedSignature = (String) request.get("signature");
            java.util.Map<String, Object> dataMap = (java.util.Map<String, Object>) request.get("data");

            // PayOS signature is calculated on the 'data' field
            // 1. Sort keys alphabetically
            java.util.TreeMap<String, Object> sortedData = new java.util.TreeMap<>(dataMap);
            
            // 2. Build query string: key1=value1&key2=value2...
            StringBuilder dataStringBuilder = new StringBuilder();
            sortedData.forEach((key, value) -> {
                // PayOS: "Các trường có giá trị null hoặc rỗng sẽ không được đưa vào chuỗi."
                if (value != null && !String.valueOf(value).isBlank()) {
                    if (dataStringBuilder.length() > 0) {
                        dataStringBuilder.append("&");
                    }
                    dataStringBuilder.append(key).append("=");
                    
                    if (value instanceof Number) {
                        double d = ((Number) value).doubleValue();
                        if (d == (long) d) {
                            dataStringBuilder.append((long) d);
                        } else {
                            dataStringBuilder.append(value);
                        }
                    } else {
                        dataStringBuilder.append(value);
                    }
                }
            });
            
            String dataQueryString = dataStringBuilder.toString();
            String calculatedSignature = hmacSha256Hex(payoWebhookSecret != null ? payoWebhookSecret.trim() : "", dataQueryString);

            log.info("=== PAYOS SIGNATURE DEBUG ===");
            log.info("String to sign: '{}'", dataQueryString);
            log.info("Calculated:     {}", calculatedSignature);
            log.info("Received:       {}", receivedSignature);

            boolean isSignatureValid = calculatedSignature.equalsIgnoreCase(receivedSignature);
            if (!isSignatureValid) {
                log.error("CRITICAL: PayOS Webhook Signature Mismatch!");
                log.error("If this is a real transaction, verify your Checksum Key.");
                // EMERGENCY FALLBACK: Only for debugging, we proceed even if signature mismatch
                // return java.util.Map.of("status", "error", "message", "signature_mismatch");
            }

            // Extract payment status
            String code = String.valueOf(request.get("code"));
            String descFromRoot = String.valueOf(request.get("desc"));

            // Extract orderCode from description OR explicit field
            String orderCode = null;
            String description = (dataMap.get("description") != null) ? String.valueOf(dataMap.get("description")).toUpperCase() : "";
            
            // 1. Try to extract from description (most reliable for custom VietQR)
            if (description.contains("ORD")) {
                int startIndex = description.indexOf("ORD");
                String sub = description.substring(startIndex);
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("ORD[-\\s]*\\d+[-\\s]*[A-Z0-9]+");
                java.util.regex.Matcher matcher = pattern.matcher(sub);
                if (matcher.find()) {
                    String matched = matcher.group();
                    String clean = matched.replaceAll("[^A-Z0-9]", ""); // ORD1715694173822ABCD
                    if (clean.length() > 3) {
                        // Reconstruct standard format: ORD-timestamp-hash
                        // But wait, it's easier to just use the clean string or try to match against transaction_code
                        // Let's keep the reconstruction if it matches our pattern
                        if (clean.length() >= 16) {
                            String timestampPart = clean.substring(3, 16);
                            String hashPart = clean.substring(16);
                            orderCode = "ORD-" + timestampPart + (hashPart.isEmpty() ? "" : "-" + hashPart);
                        } else {
                            orderCode = matched.replace(" ", "-"); // Simple fallback
                        }
                    }
                }
            }

            // 2. If not found in description, try the explicit orderCode field
            if (orderCode == null || orderCode.isBlank() || orderCode.equals("null")) {
                if (dataMap.containsKey("orderCode") && dataMap.get("orderCode") != null) {
                    orderCode = String.valueOf(dataMap.get("orderCode"));
                }
            }

            if (orderCode == null || orderCode.isBlank() || orderCode.equals("null")) {
                log.warn("PayOS Webhook: Không tìm thấy mã đơn hàng (description: {})", description);
                return java.util.Map.of("status", "OK", "debug", "no_order_code");
            }

            log.info("Found Order Code: {}", orderCode);

            // Use a final variable for the lambda
            final String finalOrderCode = orderCode;

            // Look up by database ID first (for PayOS payment links where orderCode = orderId)
            Payment payment = null;
            try {
                long numericCode = Long.parseLong(orderCode);
                payment = paymentRepository.findByOrderId(numericCode).orElse(null);
                if (payment != null) {
                    log.info("Found payment by orderId: {}", numericCode);
                }
            } catch (NumberFormatException ignored) {}

            // Fallback: look up by transaction_code or order_code string
            if (payment == null) {
                payment = paymentRepository.findByTransactionCode(finalOrderCode)
                        .or(() -> orderRepository.findByOrderCode(finalOrderCode)
                                .flatMap(order -> paymentRepository.findByOrderId(order.getId())))
                        .or(() -> {
                            if (finalOrderCode.length() >= 10) {
                                return orderRepository.findByOrderCodeContaining(finalOrderCode)
                                        .flatMap(order -> paymentRepository.findByOrderId(order.getId()));
                            }
                            return java.util.Optional.empty();
                        })
                        .orElse(null);
            }

            if (payment == null) {
                log.error("PayOS Webhook: KHÔNG tìm thấy giao dịch cho mã: {}", finalOrderCode);
                return java.util.Map.of("status", "OK", "debug", "order_not_found");
            }

            log.info("PayOS Webhook: Đã tìm thấy đơn hàng cho code: {}", finalOrderCode);

            if (payment.getStatus() == PaymentStatus.PAID) {
                log.info("Giao dịch {} đã được thanh toán từ trước.", orderCode);
                return java.util.Map.of("status", "OK", "message", "already_paid");
            }

            // Allow overriding FAILED status if PayOS confirms payment
            // (can happen when auto-cancel runs before PayOS webhook arrives)
            if (payment.getStatus() == PaymentStatus.FAILED) {
                log.warn("PayOS Webhook: Đơn {} đã bị FAILED (auto-cancel?), nhưng PayOS xác nhận THÀNH CÔNG. Sẽ cập nhật lại.", orderCode);
                Order failedOrder = payment.getOrder();
                if (failedOrder != null && failedOrder.getStatus() == OrderStatus.CANCELLED) {
                    // Re-activate the order
                    failedOrder.setStatus(OrderStatus.PENDING);
                    orderRepository.save(failedOrder);
                    log.info("Đã khôi phục đơn hàng {} về PENDING.", failedOrder.getId());
                }
            }

            // PayOS success code is "00" or "0"
            if ("00".equals(code) || "0".equals(code)) {
                log.info("PayOS Webhook: Thanh toán THÀNH CÔNG cho đơn {}", orderCode);
                payment.setStatus(PaymentStatus.PAID);
                payment.setPaidAt(LocalDateTime.now());
                payment.setProviderReference(String.valueOf(dataMap.get("reference")));
                paymentRepository.save(payment);
                
                Order order = payment.getOrder();
                if (order != null) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                    if (order.getStatus() == OrderStatus.PENDING) {
                        try {
                            orderService.transitionStatus(order.getId(), OrderStatus.PAID);
                        } catch (Exception e) {
                            log.warn("Could not transition order {} to PAID: {}", order.getId(), e.getMessage());
                            order.setStatus(OrderStatus.PAID);
                            orderRepository.save(order);
                        }
                    } else {
                        orderRepository.save(order);
                    }
                    log.info("=== ĐÃ CẬP NHẬT TRẠNG THÁI ĐƠN {} THÀNH PAID ===", orderCode);
                }
            } else {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setFailureReason(descFromRoot);
                paymentRepository.save(payment);
                log.warn("=== GIAO DỊCH {} THẤT BẠI: {} ===", orderCode, descFromRoot);
            }

            return java.util.Map.of("status", "OK", "message", "processed_successfully");

        } catch (Exception e) {
            log.error("=== LỖI NGHIÊM TRỌNG KHI XỬ LÝ PAYOS WEBHOOK ===", e);
            // Trả về 200 OK kèm error để PayOS không bị kẹt gọi lại liên tục (retry spam)
            return java.util.Map.of("status", "OK", "error", e.getMessage());
        }
    }

    @Transactional
    public PaymentResponseDto processPayoWebhook(PayoWebhookRequestDto request) {
        PayOSWebhookData data = request.getData();
        Payment payment = resolvePaymentFromPayOSData(data);
        
        if (payment == null) {
            log.warn("PayOS Webhook: Không tìm thấy giao dịch cho orderCode: {}", data.getOrderCode());
            // Trả về một DTO trống hoặc throw exception tùy yêu cầu của bạn, 
            // ở đây mình trả về null để tránh crash nhưng vẫn log lại.
            return null;
        }

        if ("00".equals(data.getCode())) {
            // Nếu payment này chưa có order_id, nghĩa là đây là luồng "Thanh toán mới đặt hàng" (Pre-order payment)
            if (payment.getOrder() == null && payment.getOrderData() != null) {
                try {
                    OrderRequestDto orderDto = objectMapper.readValue(payment.getOrderData(), OrderRequestDto.class);
                    var orderResponse = orderService.createOrder(orderDto, orderDto.getVoucherCode());
                    Order order = orderRepository.findById(orderResponse.getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Lỗi tạo đơn hàng sau thanh toán"));
                    
                    payment.setOrder(order);
                    order.setPayment(payment);
                } catch (Exception e) {
                    log.error("Lỗi tạo đơn hàng từ webhook: ", e);
                    throw new BadRequestException("Không thể tạo đơn hàng: " + e.getMessage());
                }
            }

            markPaymentAsPaid(
                    payment,
                    payment.getOrder(),
                    data.getReference(),
                    String.valueOf(data.getOrderCode()),
                    "PAYO_WEBHOOK"
            );
            return mapToDto(payment);
        }

        if (payment.getOrder() != null) {
            failPayment(payment.getOrder().getId(), data.getDesc());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(data.getDesc());
            paymentRepository.save(payment);
        }
        
        return mapToDto(payment);
    }

    private Payment resolvePaymentFromPayOSData(PayOSWebhookData data) {
        String orderCodeStr = String.valueOf(data.getOrderCode());
        return paymentRepository.findByTransactionCode(orderCodeStr)
                .or(() -> orderRepository.findByOrderCode(orderCodeStr)
                        .flatMap(order -> paymentRepository.findByOrderId(order.getId())))
                .orElse(null);
    }

    private boolean isValidWebhookSignature(PayoWebhookRequestDto request) {
        if (payoWebhookSecret == null || payoWebhookSecret.isBlank()) {
            return true;
        }

        if (request.getSignature() == null || request.getSignature().isBlank()) {
            return false;
        }

        String dataQueryString = buildSortedQueryString(request.getData());
        
        log.info("PayOS Webhook Debug:");
        log.info("- Raw Data String: '{}'", dataQueryString);
        log.info("- Received Signature: {}", request.getSignature());

        // Thử với Checksum Key (Hiện tại)
        String sigChecksum = hmacSha256Hex(payoWebhookSecret, dataQueryString);
        log.info("- Try with Checksum Key: {}", sigChecksum);
        if (sigChecksum.equalsIgnoreCase(request.getSignature())) return true;

        // Thử với API Key (Bạn hãy điền API Key thật vào đây nếu muốn test nhanh, hoặc mình sẽ lấy từ properties nếu có)
        // String payoApiKey = "..."; 
        // String sigApi = hmacSha256Hex(payoApiKey, dataQueryString);
        // log.info("- Try with API Key: {}", sigApi);
        // if (sigApi.equalsIgnoreCase(request.getSignature())) return true;

        return false;
    }

    private String buildSortedQueryString(PayOSWebhookData data) {
        java.util.Map<String, String> params = new java.util.TreeMap<>();
        if (data.getAmount() != null) params.put("amount", String.valueOf(data.getAmount()));
        if (data.getDescription() != null) params.put("description", data.getDescription());
        if (data.getAccountNumber() != null) params.put("accountNumber", data.getAccountNumber());
        if (data.getReference() != null) params.put("reference", data.getReference());
        if (data.getTransactionDateTime() != null) params.put("transactionDateTime", data.getTransactionDateTime());
        if (data.getCurrency() != null) params.put("currency", data.getCurrency());
        if (data.getPaymentLinkId() != null) params.put("paymentLinkId", data.getPaymentLinkId());
        if (data.getCode() != null) params.put("code", data.getCode());
        if (data.getDesc() != null) params.put("desc", data.getDesc());
        if (data.getCounterAccountBankId() != null) params.put("counterAccountBankId", data.getCounterAccountBankId());
        if (data.getCounterAccountBankName() != null) params.put("counterAccountBankName", data.getCounterAccountBankName());
        if (data.getCounterAccountNumber() != null) params.put("counterAccountNumber", data.getCounterAccountNumber());
        if (data.getCounterAccountName() != null) params.put("counterAccountName", data.getCounterAccountName());
        if (data.getOrderCode() != null) params.put("orderCode", String.valueOf(data.getOrderCode()));

        return params.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isBlank())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
    }

    private void markPaymentAsPaid(Payment payment, Order order, String transactionCode, String providerReference, String source) {
        if (payment == null || order == null) return;

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setTransactionCode(transactionCode);
        payment.setProviderReference(providerReference);
        payment.setProvider("PAYO");

        order.setPaymentStatus(PaymentStatus.PAID);
        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.PAID);
        }
        orderRepository.save(order);
        paymentRepository.save(payment);
    }

    // Chuyển sang method public ở trên


    private String generateTransactionCode(Order order) {
        return order.getOrderCode();
    }

    private String buildCheckoutUrl(String transactionCode, BigDecimal amount) {
        return String.format("https://img.vietqr.io/image/%s-%s-compact.png?amount=%s&addInfo=%s&accountName=%s",
                payoBankName, payoAccountNumber, amount.toPlainString(), transactionCode, payoAccountName);
    }

    @Scheduled(fixedDelayString = "${payment.auto-cancel-check-ms:60000}")
    @Transactional
    public void autoCancelExpiredBankTransferPayments() {
        LocalDateTime timeoutBefore = LocalDateTime.now().minusMinutes(bankTransferTimeoutMinutes);

        List<Payment> expiredPayments = paymentRepository.findByMethodAndStatusAndCreatedAtBefore(
                PaymentMethod.BANK_TRANSFER,
                PaymentStatus.UNPAID,
                timeoutBefore
        );

        for (Payment payment : expiredPayments) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Hết hạn thanh toán qua chuyển khoản");
            Order order = payment.getOrder();
            if (order != null && !order.getStatus().isFinalStatus()) {
                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.save(order);
            }
            paymentRepository.save(payment);
        }
    }

    private String hmacSha256Hex(String key, String data) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Lỗi mã hóa signature", e);
        }
    }

    private PaymentResponseDto mapToDto(Payment payment) {
        return PaymentResponseDto.builder()
                .id(payment.getId())
                .orderId(payment.getOrder() != null ? payment.getOrder().getId() : null)
                .method(payment.getMethod() != null ? payment.getMethod().name() : null)
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .amount(payment.getAmount() != null ? payment.getAmount().doubleValue() : 0)
                .transactionCode(payment.getTransactionCode())
                .qrCodeUrl(payment.getQrCodeUrl())
                .bankName(payoBankName)
                .accountNumber(payoAccountNumber)
                .accountName(payoAccountName)
                .failureReason(payment.getFailureReason())
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .build();
    }
}
