package com.example.demo.service;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderStatus;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.InvalidOrderStatusTransitionException;
import com.example.demo.repository.*;
import com.example.demo.validator.OrderStatusTransitionValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrderServiceTest {

    private OrderRepository orderRepository;
    private OrderStatusTransitionValidator statusValidator;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        OrderShippingRepository orderShippingRepository = mock(OrderShippingRepository.class);
        ShippingService shippingService = mock(ShippingService.class);
        statusValidator = mock(OrderStatusTransitionValidator.class);
        NotificationService notificationService = mock(NotificationService.class);
        VoucherService voucherService = mock(VoucherService.class);
        CartRepository cartRepository = mock(CartRepository.class);
        ProductUnitRepository productUnitRepository = mock(ProductUnitRepository.class);

        orderService = new OrderService(
            orderRepository,
            userRepository,
            productRepository,
            orderShippingRepository,
            shippingService,
            statusValidator,
            notificationService,
            voucherService,
            cartRepository,
            productUnitRepository
        );
    }

    @Test
    void transitionStatus_shouldRejectInvalidTransition() {
        Order order = Order.builder()
                .id(10L)
                .status(OrderStatus.PENDING)
                .user(User.builder().id(1L).build())
                .build();

        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        doThrow(new InvalidOrderStatusTransitionException("Invalid status transition: PENDING -> DELIVERED"))
            .when(statusValidator)
            .validate(any(Order.class), any(OrderStatus.class));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> orderService.transitionStatus(10L, OrderStatus.DELIVERED));

        assertEquals("Invalid status transition: PENDING -> DELIVERED", ex.getMessage());
    }
}
