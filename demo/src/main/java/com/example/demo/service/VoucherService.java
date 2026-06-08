package com.example.demo.service;

import com.example.demo.dto.voucher.VoucherRequestDto;
import com.example.demo.dto.voucher.VoucherResponseDto;
import com.example.demo.entity.Voucher;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.entity.User;
import com.example.demo.entity.UserVoucher;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.UserVoucherRepository;
import com.example.demo.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserRepository userRepository;
    private final UserVoucherRepository userVoucherRepository;

    public List<VoucherResponseDto> getAll() {
        return voucherRepository.findAll().stream()
                .filter(v -> v.getIsDeleted() == null || !v.getIsDeleted())
                .map(this::mapToDto)
                .toList();
    }

    public VoucherResponseDto getByCode(String code) {
        return mapToDto(getVoucherByCode(code));
    }

    public Voucher getVoucherByCode(String code) {
        Voucher voucher = voucherRepository.findByCode(code)
                    .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));
        if (voucher.getIsDeleted() != null && voucher.getIsDeleted()) {
            throw new ResourceNotFoundException("Mã giảm giá không tồn tại");
        }
        return voucher;
    }

    public VoucherResponseDto create(VoucherRequestDto request) {
        String code = request.getCode().trim().toUpperCase();
        if (code.isBlank()) {
            throw new BadRequestException("Mã giảm giá là bắt buộc");
        }

        validateRequest(request);

        Voucher existing = voucherRepository.findById(code).orElse(null);
        if (existing != null) {
            if (existing.getIsDeleted() != null && existing.getIsDeleted()) {
                // Hồi sinh (revive) voucher đã xóa mềm
                existing.setIsDeleted(false);
                existing.setDiscountType(request.getDiscountType());
                existing.setVoucherType(request.getVoucherType() != null ? request.getVoucherType() : "PRODUCT");
                existing.setValue(request.getValue());
                existing.setMinOrderAmount(request.getMinOrderAmount());
                existing.setStartDate(request.getStartDate());
                existing.setEndDate(request.getEndDate());
                existing.setUsageLimit(request.getUsageLimit());
                existing.setUsedCount(request.getUsedCount() != null ? request.getUsedCount() : 0);
                existing.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
                existing.setRequiredTier(request.getRequiredTier() != null ? request.getRequiredTier() : "MEMBER");
                existing.setApplicableProductIds(request.getApplicableProductIds());

                voucherRepository.save(existing);
                return mapToDto(existing);
            } else {
                throw new BadRequestException("Mã giảm giá đã tồn tại");
            }
        }

        Voucher voucher = Voucher.builder()
                .code(code)
                .discountType(request.getDiscountType())
                .voucherType(request.getVoucherType() != null ? request.getVoucherType() : "PRODUCT")
                .value(request.getValue())
                .minOrderAmount(request.getMinOrderAmount())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .usageLimit(request.getUsageLimit())
                .usedCount(request.getUsedCount() != null ? request.getUsedCount() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .isDeleted(false)
                .requiredTier(request.getRequiredTier() != null ? request.getRequiredTier() : "MEMBER")
                .applicableProductIds(request.getApplicableProductIds())
                .build();

        voucherRepository.save(voucher);
        return mapToDto(voucher);
    }

    public VoucherResponseDto update(String code, VoucherRequestDto request) {
        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        validateRequest(request);

        voucher.setDiscountType(request.getDiscountType());
        voucher.setVoucherType(request.getVoucherType() != null ? request.getVoucherType() : "PRODUCT");
        voucher.setValue(request.getValue());
        voucher.setMinOrderAmount(request.getMinOrderAmount());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        voucher.setUsageLimit(request.getUsageLimit());
        voucher.setUsedCount(request.getUsedCount() != null ? request.getUsedCount() : voucher.getUsedCount());
        voucher.setIsActive(request.getIsActive() != null ? request.getIsActive() : voucher.getIsActive());
        voucher.setRequiredTier(request.getRequiredTier());
        voucher.setApplicableProductIds(request.getApplicableProductIds());

        voucherRepository.save(voucher);
        return mapToDto(voucher);
    }

    public void delete(String code) {
        Voucher voucher = getVoucherByCode(code);
        voucher.setIsDeleted(true);
        voucher.setIsActive(false);
        voucherRepository.save(voucher);
    }

    public VoucherResponseDto toggleActive(String code, boolean active) {
        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));
        voucher.setIsActive(active);
        voucherRepository.save(voucher);
        return mapToDto(voucher);
    }

    public VoucherResponseDto validateVoucher(Long userId, String code, Double subtotal) {
        if (subtotal == null || subtotal < 0) {
            throw new BadRequestException("Tổng tiền đơn hàng không hợp lệ");
        }

        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không tồn tại"));

        if (voucher.getIsActive() != null && !voucher.getIsActive()) {
            throw new BadRequestException("Mã giảm giá hiện không khả dụng");
        }
        if (voucher.getStartDate() != null && voucher.getStartDate().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Cam kết giảm giá chưa bắt đầu");
        }
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã giảm giá đã hết hạn");
        }
        if (voucher.getUsageLimit() != null && voucher.getUsedCount() != null
                && voucher.getUsageLimit() <= voucher.getUsedCount()) {
            throw new BadRequestException("Giới hạn sử dụng của mã giảm giá đã đạt được");
        }
        if (voucher.getMinOrderAmount() != null && subtotal < voucher.getMinOrderAmount()) {
            throw new BadRequestException("Total giỏ hàng của bạn không đạt yêu cầu tối thiểu của " + voucher.getMinOrderAmount());
        }

        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                boolean hasUsed = userVoucherRepository.findByUser(user).stream()
                        .anyMatch(uv -> uv.getVoucher().getCode().equalsIgnoreCase(code) && uv.isUsed());
                if (hasUsed) {
                    throw new BadRequestException("Bạn đã sử dụng mã giảm giá này rồi. Mỗi mã chỉ được dùng 1 lần.");
                }
            }
        }

        return mapToDto(voucher);
    }

    public List<VoucherResponseDto> getVouchersForCheckout(Long userId, Double subtotal, List<Long> cartProductIds) {
        User user = userRepository.findById(userId).orElse(null);
        String userTier = (user != null && user.getTier() != null) ? user.getTier() : "MEMBER";

        LocalDateTime now = LocalDateTime.now();
        List<Voucher> vouchers = voucherRepository.findAll().stream()
                .filter(v -> v.getIsDeleted() == null || !v.getIsDeleted())
                .filter(v -> v.getIsActive() != null && v.getIsActive())
                .filter(v -> v.getStartDate() == null || v.getStartDate().isBefore(now))
                .filter(v -> v.getEndDate() == null || v.getEndDate().isAfter(now))
                .filter(v -> (v.getUsageLimit() == null || v.getUsedCount() < v.getUsageLimit()))
                .toList();

        return vouchers.stream().map(v -> {
            VoucherResponseDto dto = mapToDto(v);
            dto.setIsApplicable(true);

            if (user != null) {
                boolean hasUsed = userVoucherRepository.findByUser(user).stream()
                        .anyMatch(uv -> uv.getVoucher().getCode().equalsIgnoreCase(v.getCode()) && uv.isUsed());
                if (hasUsed) {
                    dto.setIsApplicable(false);
                    dto.setInapplicableReason("Đã sử dụng");
                    return dto;
                }
            }

            if (v.getMinOrderAmount() != null && subtotal < v.getMinOrderAmount()) {
                dto.setIsApplicable(false);
                dto.setInapplicableReason("Đơn hàng chưa đạt " + String.format("%,.0f", v.getMinOrderAmount()) + "đ");
            } else if (v.getRequiredTier() != null && !isTierEligible(userTier, v.getRequiredTier())) {
                dto.setIsApplicable(false);
                dto.setInapplicableReason("Yêu cầu hạng " + v.getRequiredTier());
            } else if ("PRODUCT".equalsIgnoreCase(v.getVoucherType()) && v.getApplicableProductIds() != null && !v.getApplicableProductIds().isEmpty()) {
                boolean hasMatchingProduct = cartProductIds != null && cartProductIds.stream().anyMatch(pid -> v.getApplicableProductIds().contains(pid));
                if (!hasMatchingProduct) {
                    dto.setIsApplicable(false);
                    dto.setInapplicableReason("Không áp dụng cho sản phẩm này");
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }

    private boolean isTierEligible(String userTier, String requiredTier) {
        List<String> tiers = Arrays.asList("MEMBER", "SILVER", "GOLD", "DIAMOND");
        int userIndex = tiers.indexOf(userTier.toUpperCase());
        int requiredIndex = tiers.indexOf(requiredTier.toUpperCase());
        return userIndex >= requiredIndex;
    }

    public List<VoucherResponseDto> getAvailableVouchers(Long userId) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        List<UserVoucher> userVouchers = user != null ? userVoucherRepository.findByUser(user) : List.of();

        LocalDateTime now = LocalDateTime.now();
        List<Voucher> allActive = voucherRepository.findAll().stream()
                .filter(v -> v.getIsDeleted() == null || !v.getIsDeleted())
                .filter(v -> v.getIsActive() != null && v.getIsActive())
                .filter(v -> v.getStartDate() == null || v.getStartDate().isBefore(now))
                .filter(v -> v.getEndDate() == null || v.getEndDate().isAfter(now))
                .filter(v -> v.getUsageLimit() == null || v.getUsedCount() < v.getUsageLimit())
                .toList();

        return allActive.stream()
                .map(v -> {
                    VoucherResponseDto dto = mapToDto(v);
                    if (user != null) {
                        UserVoucher uv = userVouchers.stream()
                                .filter(u -> u.getVoucher().getCode().equals(v.getCode()))
                                .findFirst().orElse(null);
                        dto.setIsCollected(uv != null);
                        dto.setIsUsed(uv != null && uv.isUsed());
                    } else {
                        dto.setIsCollected(false);
                        dto.setIsUsed(false);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<VoucherResponseDto> getMyVouchers(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        LocalDateTime now = LocalDateTime.now();
        return userVoucherRepository.findByUserAndUsedFalse(user).stream()
                .map(UserVoucher::getVoucher)
                .filter(v -> v.getIsDeleted() == null || !v.getIsDeleted())
                .filter(v -> v.getIsActive() != null && v.getIsActive())
                .filter(v -> v.getStartDate() == null || v.getStartDate().isBefore(now))
                .filter(v -> v.getEndDate() == null || v.getEndDate().isAfter(now))
                .filter(v -> v.getUsageLimit() == null || v.getUsedCount() < v.getUsageLimit())
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public VoucherResponseDto collectVoucher(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        if (userVoucherRepository.existsByUserAndVoucher(user, voucher)) {
            throw new BadRequestException("Bạn đã thu thập mã giảm giá này rồi");
            }
        if (voucher.getIsActive() != null && !voucher.getIsActive()) {            throw new BadRequestException("Mã giảm giá hiện không khả dụng");
        }
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã giảm giá đã hết hạn");
        }
        if (voucher.getUsageLimit() != null && voucher.getUsedCount() >= voucher.getUsageLimit()) {
            throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
        }

        UserVoucher userVoucher = UserVoucher.builder()
                .user(user)
                .voucher(voucher)
                .used(false)
                .build();

        userVoucherRepository.save(userVoucher);
        return mapToDto(voucher);
    }

    private void validateRequest(VoucherRequestDto request) {
        if (request.getDiscountType() == null) {
            throw new BadRequestException("Giảm giá phải có loại (PERCENT hoặc FIXED)");
        }
        if (request.getValue() == null || request.getValue() <= 0) {
            throw new BadRequestException("Giá trị giảm giá phải lớn hơn 0");
        }
        if (request.getMinOrderAmount() == null || request.getMinOrderAmount() < 0) {
            throw new BadRequestException("Số tiền tối thiểu để áp dụng voucher phải >= 0");
        }
        if (request.getUsageLimit() == null || request.getUsageLimit() <= 0) {
            throw new BadRequestException("Giới hạn sử dụng phải lớn hơn 0");
        }
        if (request.getUsedCount() != null && request.getUsedCount() < 0) {
            throw new BadRequestException("Số lần sử dụng phải >= 0");
        }
        if (request.getUsedCount() != null && request.getUsedCount() > request.getUsageLimit()) {
            throw new BadRequestException("Số lần sử dụng không được vượt quá giới hạn sử dụng");
        }
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }
    }
    public Double calculateDiscount(Long userId, String code, Double subtotal) {
        VoucherResponseDto voucher = validateVoucher(userId, code, subtotal);
        if (voucher.getDiscountType() == null || voucher.getValue() == null) {
            return 0.0;
        }
        double discount = switch (voucher.getDiscountType()) {
            case PERCENT -> subtotal * (voucher.getValue() / 100);
            case FIXED -> voucher.getValue();
        };
        return Math.min(discount, subtotal);
    }

    public void markVoucherAsUsed(User user, String code) {
        if (code == null || code.isBlank()) return;
        Voucher voucher = voucherRepository.findByCode(code).orElse(null);
        if (voucher == null) return;

        userVoucherRepository.findByUser(user).stream()
                .filter(uv -> uv.getVoucher().getCode().equalsIgnoreCase(code) && !uv.isUsed())
                .findFirst()
                .ifPresent(uv -> {
                    uv.setUsed(true);
                    userVoucherRepository.save(uv);
                });

        if (voucher.getUsedCount() == null) voucher.setUsedCount(0);
        voucher.setUsedCount(voucher.getUsedCount() + 1);
        voucherRepository.save(voucher);
    }

    public void markVoucherAsUnused(User user, String code) {
        if (code == null || code.isBlank() || user == null) return;
        Voucher voucher = voucherRepository.findByCode(code).orElse(null);
        if (voucher == null) return;

        userVoucherRepository.findByUser(user).stream()
                .filter(uv -> uv.getVoucher().getCode().equalsIgnoreCase(code) && uv.isUsed())
                .findFirst()
                .ifPresent(uv -> {
                    uv.setUsed(false);
                    userVoucherRepository.save(uv);
                });

        if (voucher.getUsedCount() != null && voucher.getUsedCount() > 0) {
            voucher.setUsedCount(voucher.getUsedCount() - 1);
            voucherRepository.save(voucher);
        }
    }

    private VoucherResponseDto mapToDto(Voucher voucher) {
        return VoucherResponseDto.builder()
                .code(voucher.getCode())
                .discountType(voucher.getDiscountType())
                .voucherType(voucher.getVoucherType())
                .value(voucher.getValue())
                .minOrderAmount(voucher.getMinOrderAmount())
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .usageLimit(voucher.getUsageLimit())
                .usedCount(voucher.getUsedCount())
                .isActive(voucher.getIsActive())
                .requiredTier(voucher.getRequiredTier())
                .applicableProductIds(voucher.getApplicableProductIds())
                .build();
    }
}
