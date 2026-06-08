package com.example.demo.entity;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;


public enum OrderStatus {
    PENDING("Chờ thanh toán"),
    PAID("Đã thanh toán"),
    CONFIRMED("Đã xác nhận"),
    PACKING("Đang đóng gói"),
    SHIPPING("Đang vận chuyển"),
    DELIVERED("Đã giao"),
    DELIVERY_DISPUTE("Khiếu nại chưa nhận hàng"),
    COMPLETED("Hoàn thành"),

    CANCELLED("Đã hủy"),
    RETURN_REQUESTED("Yêu cầu hoàn trả"),
    RETURN_PICKING("Đang lấy hàng hoàn"),
    RETURN_AWAITING_ADMIN_CONFIRM("Chờ quản trị xác nhận hàng về kho"),
    RETURNED_TO_WAREHOUSE("Hàng đã về kho hoàn"),
    RETURNED("Đã hoàn trả"),
    LOST("Thất lạc/Đã hoàn tiền");

    private final String displayName;

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.ofEntries(
        Map.entry(PENDING, EnumSet.of(CONFIRMED, PAID, CANCELLED)),
        Map.entry(PAID, EnumSet.of(CONFIRMED, PACKING, CANCELLED)),
        Map.entry(CONFIRMED, EnumSet.of(PACKING, CANCELLED)),
        Map.entry(PACKING, EnumSet.of(SHIPPING, CANCELLED)),
        Map.entry(SHIPPING, EnumSet.of(DELIVERED, CANCELLED, RETURN_AWAITING_ADMIN_CONFIRM)),
        Map.entry(DELIVERED, EnumSet.of(COMPLETED, RETURN_REQUESTED, CANCELLED, DELIVERY_DISPUTE)),
        Map.entry(DELIVERY_DISPUTE, EnumSet.of(DELIVERED, CANCELLED, LOST)),
        Map.entry(COMPLETED, EnumSet.of(RETURN_REQUESTED, DELIVERY_DISPUTE)),
        Map.entry(CANCELLED, EnumSet.noneOf(OrderStatus.class)),
        Map.entry(RETURN_REQUESTED, EnumSet.of(RETURN_PICKING, CANCELLED)),
        Map.entry(RETURN_PICKING, EnumSet.of(RETURN_AWAITING_ADMIN_CONFIRM, CANCELLED)),
        Map.entry(RETURN_AWAITING_ADMIN_CONFIRM, EnumSet.of(RETURNED_TO_WAREHOUSE, CANCELLED)),
        Map.entry(RETURNED_TO_WAREHOUSE, EnumSet.of(RETURNED, COMPLETED, CANCELLED)),
        Map.entry(RETURNED, EnumSet.noneOf(OrderStatus.class)),
        Map.entry(LOST, EnumSet.noneOf(OrderStatus.class))
    );
    OrderStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }


    public boolean canTransitionTo(OrderStatus nextStatus) {
        return TRANSITIONS.getOrDefault(this, EnumSet.noneOf(OrderStatus.class)).contains(nextStatus);
    }

    public Set<OrderStatus> getValidTransitions() {
        return TRANSITIONS.getOrDefault(this, EnumSet.noneOf(OrderStatus.class));
    }

    public boolean isFinalStatus() {
        return this == COMPLETED || this == CANCELLED || this == RETURNED || this == LOST;
    }

    public boolean canBeCancelled() {
        return !isFinalStatus();
    }
}
