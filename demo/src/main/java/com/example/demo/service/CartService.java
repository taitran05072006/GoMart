package com.example.demo.service;

import com.example.demo.dto.cart.CartItemResponseDto;
import com.example.demo.dto.cart.CartItemRequestDto;
import com.example.demo.dto.cart.CartResponseDto;
import com.example.demo.dto.product.ProductUnitDto;
import com.example.demo.entity.Cart;
import com.example.demo.entity.CartItem;
import com.example.demo.entity.Product;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.CartRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductUnitRepository;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;

    public CartResponseDto getCart(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Cart cart = getOrCreateCart(user);
        return mapToDto(cart);
    }

    public CartResponseDto addToCart(Long userId, CartItemRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Cart cart = getOrCreateCart(user);

        Product product = productRepository.findById(dto.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));

        String incomingUnit = dto.getUnit() != null ? dto.getUnit().trim() : "";
        CartItem item = cart.getItems() != null ?
                cart.getItems().stream()
                        .filter(i -> i.getProduct().getId().equals(product.getId())
                                && incomingUnit.equalsIgnoreCase(i.getUnit() != null ? i.getUnit().trim() : ""))
                        .findFirst().orElse(null)
                : null;

        if (item != null) {
            item.setQuantity(item.getQuantity() + dto.getQuantity());
            item.setUnit(dto.getUnit());
            item.setConversionRate(dto.getConversionRate() != null ? dto.getConversionRate() : 1.0);
        } else {
            CartItem newItem = CartItem.builder()
                    .product(product)
                    .quantity(dto.getQuantity())
                    .unit(dto.getUnit())
                    .conversionRate(dto.getConversionRate() != null ? dto.getConversionRate() : 1.0)
                    .selected(true)
                    .cart(cart)
                    .build();

            cart.getItems().add(newItem);
        }

        cartRepository.save(cart);
        return mapToDto(cart);
    }

    public CartResponseDto removeItem(Long userId, Long cartItemId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Cart cart = getOrCreateCart(user);

        cart.getItems().removeIf(i -> i.getId().equals(cartItemId));

        cartRepository.save(cart);
        return mapToDto(cart);
    }

    public void clearCart(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Cart cart = getOrCreateCart(user);
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    public CartResponseDto updateQuantity(Long userId, Long cartItemId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Số lượng phải lớn hơn 0");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Cart cart = getOrCreateCart(user);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng"));

        item.setQuantity(quantity);
        cartRepository.save(cart);
        return mapToDto(cart);
    }

    @Transactional
    public CartResponseDto updateUnit(Long userId, Long cartItemId, String unit, Double conversionRate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Cart cart = getOrCreateCart(user);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng"));

        String targetUnit = unit != null ? unit.trim() : "";

        CartItem existingItem = cart.getItems().stream()
                .filter(i -> !i.getId().equals(cartItemId)
                        && i.getProduct().getId().equals(item.getProduct().getId())
                        && targetUnit.equalsIgnoreCase(i.getUnit() != null ? i.getUnit().trim() : ""))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + item.getQuantity());
            cart.getItems().remove(item);
        } else {
            item.setUnit(unit);
            item.setConversionRate(conversionRate != null ? conversionRate : 1.0);
        }

        cartRepository.save(cart);
        return mapToDto(cart);
    }

    private CartResponseDto mapToDto(Cart cart) {
        List<CartItemResponseDto> itemss = cart.getItems() == null ? List.of() :
                cart.getItems().stream().map(i -> {
                List<ProductUnitDto> availableUnits = new ArrayList<>();
                availableUnits.add(ProductUnitDto.builder()
                        .name(i.getProduct().getUnit() != null ? i.getProduct().getUnit() : "Hộp")
                        .conversionRate(1.0)
                        .price(i.getProduct().getPrice() != null ? i.getProduct().getPrice().doubleValue() : 0.0)
                        .oldPrice(i.getProduct().getOldPrice() != null ? i.getProduct().getOldPrice().doubleValue() : 0.0)
                        .build());

                availableUnits.addAll(productUnitRepository
                        .findByProductId(i.getProduct().getId())
                        .stream()
                        .map(u -> ProductUnitDto.builder()
                                .id(u.getId())
                                .name(u.getName())
                                .conversionRate(u.getConversionRate())
                                .price(u.getPrice() != null ? u.getPrice().doubleValue() : 0.0)
                                .oldPrice(u.getOldPrice() != null ? u.getOldPrice().doubleValue() : 0.0)
                                .build())
                        .toList());

                double discountPercent = i.getProduct().getDiscount() != null ? i.getProduct().getDiscount() : 0.0;
                availableUnits.forEach(u -> {
                    double originalPrice = u.getPrice() != null ? u.getPrice() : 0.0;
                    u.setOldPrice(originalPrice);
                    u.setPrice(originalPrice * (1 - discountPercent / 100.0));
                });

                double finalUnitPrice;
                ProductUnitDto matchedUnit = availableUnits.stream()
                        .filter(u -> u.getName() != null && u.getName().equalsIgnoreCase(i.getUnit()))
                        .findFirst()
                        .orElse(null);

                if (matchedUnit != null) {
                    finalUnitPrice = matchedUnit.getPrice();
                } else {
                    // Fallback to base calculation
                    double basePrice = i.getProduct().getPrice() != null ? i.getProduct().getPrice() : 0;
                    finalUnitPrice = (basePrice * (1 - discountPercent / 100.0)) * (i.getConversionRate() != null ? i.getConversionRate() : 1.0);
                }

                    return CartItemResponseDto.builder()
                            .id(i.getId())
                            .productId(i.getProduct().getId())
                            .productName(i.getProduct().getName())
                            .quantity(i.getQuantity())
                            .price(finalUnitPrice)
                            .imageUrl(i.getProduct().getImageUrl())
                            .selected(i.isSelected())
                            .unit(i.getUnit())
                            .conversionRate(i.getConversionRate())
                            .availableUnits(availableUnits)
                            .build();
                }).toList();

        double total = itemss.stream()
            .mapToDouble(item -> item.getPrice() * item.getQuantity())
            .sum();

        return CartResponseDto.builder()
                .userId(cart.getUser().getId())
                .items(itemss)
                .totalPrice(total)
                .build();
    }

    private Cart getOrCreateCart(User user) {
        Cart cart = cartRepository.findByUser(user);
        if (cart == null) {
            cart = Cart.builder()
                    .user(user)
                    .items(new ArrayList<>())
                    .build();
            return cartRepository.save(cart);
        }
        if (cart.getItems() == null) {
            cart.setItems(new ArrayList<CartItem>());
        }
        return cart;
    }
    @Transactional
    public CartResponseDto toggle(Long userId, boolean select) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Cart cart = getOrCreateCart(user);

        if (cart.getItems().isEmpty()) {
            return mapToDto(cart);
        }

        cart.getItems().forEach(item -> item.setSelected(select));

        cartRepository.save(cart);

        return mapToDto(cart);
    }

    @Transactional
    public CartResponseDto selectItem(Long userId, Long cartItemId, boolean selected) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Cart cart = getOrCreateCart(user);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng"));

        item.setSelected(selected);
        cartRepository.save(cart);
        return mapToDto(cart);
    }
}
