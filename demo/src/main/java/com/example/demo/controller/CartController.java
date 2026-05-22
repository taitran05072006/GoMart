package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.cart.CartItemRequestDto;
import com.example.demo.dto.cart.CartResponseDto;
import com.example.demo.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

    @RestController
    @CrossOrigin("*")
    @RequestMapping("/api/cart")
    @RequiredArgsConstructor
    public class CartController {

        private final CartService cartService;

        @GetMapping("/{userId}")
        public ApiResponse<CartResponseDto> getCart(@PathVariable Long userId) {
            return ApiResponse.success(cartService.getCart(userId));
        }

        @PostMapping("/{userId}/add")
        public ApiResponse<CartResponseDto> addToCart(
                @PathVariable Long userId,
                @RequestBody CartItemRequestDto dto
        ) {
            return ApiResponse.success("Đã thêm vào giỏ hàng", cartService.addToCart(userId, dto));
        }

        @PutMapping("/{userId}/update/{cartItemId}")
        public ApiResponse<CartResponseDto> updateQuantity(
                @PathVariable Long userId,
                @PathVariable Long cartItemId,
                @RequestParam Integer quantity
        ) {
            return ApiResponse.success("Đã cập nhật giỏ hàng", cartService.updateQuantity(userId, cartItemId, quantity));
        }

        @DeleteMapping("/{userId}/remove/{cartItemId}")
        public ApiResponse<CartResponseDto> removeItem(
                @PathVariable Long userId,
                @PathVariable Long cartItemId
        ) {
            return ApiResponse.success("Đã xóa khỏi giỏ hàng", cartService.removeItem(userId, cartItemId));
        }

        @DeleteMapping("/{userId}/clear")
        public ApiResponse<String> clearCart(@PathVariable Long userId) {
            cartService.clearCart(userId);
            return ApiResponse.success("Đã làm trống giỏ hàng", null);
        }

        @PostMapping("/{userId}/select/{cartItemId}")
        public ApiResponse<CartResponseDto> selectItem(
            @PathVariable Long userId,
            @PathVariable Long cartItemId,
                @RequestParam boolean selected
        ) {
            return ApiResponse.success(
                "Đã cập nhật lựa chọn sản phẩm trong giỏ hàng",
                cartService.selectItem(userId, cartItemId, selected)
            );
        }

        @PutMapping("/{userId}/toggle-all")
        public ApiResponse<CartResponseDto> toggleAll(
            @PathVariable Long userId,
            @RequestParam boolean selected
        ) {
            return ApiResponse.success(
                "Đã cập nhật lựa chọn giỏ hàng",
                cartService.toggle(userId, selected)
            );
        }

        @PutMapping("/{userId}/update-unit/{cartItemId}")
        public ApiResponse<CartResponseDto> updateUnit(
            @PathVariable Long userId,
            @PathVariable Long cartItemId,
            @RequestParam String unit,
            @RequestParam Double conversionRate
        ) {
            return ApiResponse.success(
                "Đã cập nhật đơn vị tính",
                cartService.updateUnit(userId, cartItemId, unit, conversionRate)
            );
        }
    }