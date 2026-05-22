package com.example.demo.service;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderStatus;
import com.example.demo.entity.Payment;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.PaymentStatus;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceTest {

    private PaymentRepository paymentRepository;
    private OrderRepository orderRepository;
    private OrderService orderService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        orderRepository = mock(OrderRepository.class);
        orderService = mock(OrderService.class);
        objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        paymentService = new PaymentService(paymentRepository, orderRepository, orderService, objectMapper);
    }

    @Test
    void confirmPayment_shouldMarkOrderPaid() {
        Order order = Order.builder()
                .id(1L)
                .status(OrderStatus.PENDING)
                .totalPrice(100.0)
                .user(User.builder().id(2L).build())
                .build();

        Payment payment = Payment.builder()
                .id(5L)
                .order(order)
                .method(PaymentMethod.BANK_TRANSFER)
                .status(PaymentStatus.PENDING)
                .amount(BigDecimal.valueOf(100.0))
                .build();

        when(paymentRepository.findByOrderId(1L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = paymentService.confirmPayment(1L);

        assertEquals("PAID", result.getStatus());
        assertNotNull(result.getTransactionCode());
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void confirmPayment_shouldRejectCodConfirmation() {
        Order order = Order.builder()
                .id(1L)
                .status(OrderStatus.PENDING)
                .user(User.builder().id(2L).build())
                .build();

        Payment payment = Payment.builder()
                .id(5L)
                .order(order)
                .method(PaymentMethod.COD)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.findByOrderId(1L)).thenReturn(Optional.of(payment));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> paymentService.confirmPayment(1L));

        assertEquals("COD is paid on delivery and cannot be confirmed at checkout", ex.getMessage());
    }

    @Test
    void confirmPayment_shouldRejectCancelledOrder() {
        Order order = Order.builder()
                .id(1L)
                .status(OrderStatus.CANCELLED)
                .user(User.builder().id(2L).build())
                .build();

        Payment payment = Payment.builder()
                .id(5L)
                .order(order)
                .method(PaymentMethod.BANK_TRANSFER)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.findByOrderId(1L)).thenReturn(Optional.of(payment));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> paymentService.confirmPayment(1L));

        assertEquals("Cannot confirm payment for cancelled order", ex.getMessage());
    }
}
