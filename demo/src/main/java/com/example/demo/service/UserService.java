package com.example.demo.service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.auth.*;
import com.example.demo.dto.user.CreateAdminAccountRequestDto;
import com.example.demo.dto.user.AdminUserResponseDto;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.exception.EmailAlreadyExistException;
import com.example.demo.exception.InvalidPasswordException;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UserNotFoundException;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.StoreRepository;
import com.example.demo.service.RegionDetectionService;
import com.example.demo.entity.Store;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

@Service
@Slf4j
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final MailService mailService;
    private final StoreRepository storeRepository;
    private final RegionDetectionService regionDetectionService;

    public UserService(OtpService optService, MailService mailService, UserRepository repo, PasswordEncoder passwordEncoder, StoreRepository storeRepository, RegionDetectionService regionDetectionService) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.otpService = optService;
        this.mailService = mailService;
        this.storeRepository = storeRepository;
        this.regionDetectionService = regionDetectionService;
    }



    public ApiResponse<AuthResponseDto> register(RegisterRequestDtoDto request){
        if(repo.existsByEmail(request.getEmail())) throw  new EmailAlreadyExistException("Email đã tồn tại!");

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        user.setRole(Role.CUSTORMER);

        repo.save(user);

        return ApiResponse.success("User được đăng ký thành công!", mapToAuthDto(user));
    }

    public ApiResponse<AuthResponseDto> login(LoginRequestDto request){
        Optional<User> OptionUser = repo.findByEmail(request.getEmail());
        if(OptionUser.isEmpty()) throw new UserNotFoundException("Email không tồn tại!");
        User user = OptionUser.get();
        if(!passwordEncoder.matches(request.getPassword(), user.getPassword())) throw new InvalidPasswordException("Mật khẩu không đúng!");

        return ApiResponse.success("Đăng nhập thành công!", mapToAuthDto(user));
    }

    public ApiResponse<AuthResponseDto> updateProfile(UpdateProfileRequestDto request){
        User user = repo.findById(request.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User không tồn tại!"));

        // update từng field nếu có
        if(request.getName() != null && !request.getName().isBlank()){
            user.setName(request.getName());
        }

        if(request.getPhone() != null && !request.getPhone().isBlank()){
            user.setPhone(request.getPhone());
        }

        if(request.getAddress() != null && !request.getAddress().isBlank()){
            user.setAddress(request.getAddress());
        }

        if(request.getProvince() != null && !request.getProvince().isBlank()){
            user.setProvince(request.getProvince());
        }

        if(request.getDistrict() != null && !request.getDistrict().isBlank()){
            user.setDistrict(request.getDistrict());
        }

        if(request.getWard() != null && !request.getWard().isBlank()){
            user.setWard(request.getWard());
        }

        if(request.getHouseNumber() != null && !request.getHouseNumber().isBlank()){
            user.setHouseNumber(request.getHouseNumber());
        }

        if(request.getAvatar() != null && !request.getAvatar().isBlank()){
            user.setAvatar(request.getAvatar());
        }

        // Auto-update the full address string for legacy support
        StringBuilder fullAddress = new StringBuilder();
        if (user.getHouseNumber() != null) fullAddress.append(user.getHouseNumber()).append(", ");
        if (user.getWard() != null) fullAddress.append(user.getWard()).append(", ");
        if (user.getDistrict() != null) fullAddress.append(user.getDistrict()).append(", ");
        if (user.getProvince() != null) fullAddress.append(user.getProvince());

        String addr = fullAddress.toString().trim();
        if (addr.endsWith(",")) addr = addr.substring(0, addr.length() - 1);
        user.setAddress(addr);

        repo.save(user);

        if (request.getStoreId() != null) {
            Store requestedStore = storeRepository.findById(request.getStoreId()).orElse(null);
            if (requestedStore != null) {
                user.setStore(requestedStore);
                repo.save(user);
            }
        } else {
            // After updating address, attempt to associate nearest store for the user.
            try {
                String userAddress = user.getAddress();
                if (userAddress != null && !userAddress.isBlank()) {
                    var stores = regionDetectionService.storesByAddress(userAddress);
                    if (stores != null && !stores.isEmpty()) {
                        // If client provided coordinates, prefer nearest by distance
                        Double lat = request.getLatitude();
                        Double lng = request.getLongitude();
                        com.example.demo.entity.Store best = null;
                        if (lat != null && lng != null) {
                            double minD = Double.MAX_VALUE;
                            for (com.example.demo.entity.Store s : stores) {
                                if (s.getLatitude() == null || s.getLongitude() == null) continue;
                                double d = haversineKm(lat, lng, s.getLatitude(), s.getLongitude());
                                if (d < minD) { minD = d; best = s; }
                            }
                        }
                        if (best == null) {
                            best = stores.get(0);
                        }
                        if (best != null) {
                            user.setStore(best);
                            repo.save(user);
                        }
                    }
                }
            } catch (Exception ex) {
                // Don't fail profile update if store association fails
                log.warn("Failed to auto-assign store for user {}: {}", user.getId(), ex.getMessage());
            }
        }

        return ApiResponse.success("Cập nhật profile thành công!", mapToAuthDto(user));
    }

    // Haversine distance in kilometers
    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    public ApiResponse<String> changePassword(ChangePasswordRequestDto request){
        User user = repo.findById(request.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User không tồn tại!"));

        // check mật khẩu cũ
        if(!passwordEncoder.matches(request.getOldPassword(), user.getPassword())){
            throw new InvalidPasswordException("Mật khẩu cũ không đúng!");
        }

        // validate password mới
        if(request.getNewPassword() == null || request.getNewPassword().length() < 6){
            throw new RuntimeException("Mật khẩu mới phải >= 6 ký tự");
        }

        // tránh đổi trùng mật khẩu cũ
        if(passwordEncoder.matches(request.getNewPassword(), user.getPassword())){
            throw new RuntimeException("Mật khẩu mới không được trùng mật khẩu cũ");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        repo.save(user);

        return ApiResponse.success("Đổi mật khẩu thành công!", null);
    }

    public ApiResponse<List<AdminUserResponseDto>> getAllUsersForAdmin() {
        List<AdminUserResponseDto> users = repo.findAll().stream()
                .filter(u -> u.getRole() == Role.CUSTORMER)
                .map(this::mapToAdminDto)
                .toList();
        return ApiResponse.success(users);
    }

    public ApiResponse<AdminUserResponseDto> createAdminAccount(CreateAdminAccountRequestDto request, Role requesterRole, Long requesterStoreId, Long impersonatedStoreId) {
        if (request == null) {
            throw new BadRequestException("Thiếu dữ liệu tạo tài khoản");
        }

        String name = request.getName() != null ? request.getName().trim() : "";
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        String phone = request.getPhone() != null ? request.getPhone().trim() : "";
        String password = request.getPassword() != null ? request.getPassword() : "";

        if (name.isBlank() || email.isBlank() || phone.isBlank() || password.isBlank()) {
            throw new BadRequestException("Vui lòng điền đầy đủ thông tin tài khoản");
        }

        if (repo.existsByEmail(email)) {
            throw new EmailAlreadyExistException("Email đã tồn tại!");
        }

        if (phone.isBlank()) {
            throw new BadRequestException("Vui lòng nhập số điện thoại");
        }

        Role targetRole;
        try {
            targetRole = Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (Exception ex) {
            throw new BadRequestException("Vai trò không hợp lệ");
        }

        boolean requesterIsSuperAdmin = requesterRole == Role.SUPER_ADMIN;
        boolean requesterIsStoreAdmin = requesterRole == Role.STORE_ADMIN;
        boolean storeScopedMode = impersonatedStoreId != null;

        if (requesterIsSuperAdmin) {
            if (storeScopedMode) {
                if (targetRole != Role.SHIPPER) {
                    throw new BadRequestException("Trong chế độ cửa hàng, SUPER_ADMIN chỉ được tạo SHIPPER");
                }
            } else if (targetRole != Role.STORE_ADMIN && targetRole != Role.SUPER_ADMIN) {
                throw new BadRequestException("SUPER_ADMIN chỉ được tạo tài khoản SUPER_ADMIN hoặc STORE_ADMIN");
            }
        } else if (requesterIsStoreAdmin) {
            if (targetRole != Role.SHIPPER) {
                throw new BadRequestException("STORE_ADMIN chỉ được tạo tài khoản SHIPPER");
            }
        } else {
            throw new BadRequestException("Không có quyền tạo tài khoản");
        }

        User user = User.builder()
                .name(name)
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode(password))
                .role(targetRole)
                .build();

        if (targetRole == Role.STORE_ADMIN) {
            if (request.getStoreId() == null) {
                throw new BadRequestException("Vui lòng chọn cửa hàng cho tài khoản STORE_ADMIN");
            }
            Store store = storeRepository.findById(request.getStoreId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cửa hàng không tồn tại"));
            user.setStore(store);
        } else if (requesterIsStoreAdmin || storeScopedMode) {
            Long targetStoreId = storeScopedMode ? impersonatedStoreId : requesterStoreId;
            if (targetStoreId == null) {
                throw new BadRequestException("Tài khoản của bạn chưa gắn cửa hàng");
            }
            Store store = storeRepository.findById(targetStoreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cửa hàng không tồn tại"));
            user.setStore(store);
        }

        repo.save(user);
        return ApiResponse.success("Tạo tài khoản thành công", mapToAdminDto(user));
    }

    public ApiResponse<AdminUserResponseDto> updateUserRole(Long userId, com.example.demo.dto.user.UpdateUserRoleRequestDto request) {
        User user = repo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (request.getRole() == null || request.getRole().isBlank()) {
            throw new IllegalArgumentException("Vai trò mới không được để trống");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Các giá trị cho phép: SUPER_ADMIN, STORE_ADMIN, CUSTORMER, SHIPPER");
        }

        user.setRole(role);

        if (role == Role.STORE_ADMIN) {
            if (request.getStoreId() != null) {
                Store store = storeRepository.findById(request.getStoreId())
                        .orElseThrow(() -> new ResourceNotFoundException("Cửa hàng không tồn tại"));
                user.setStore(store);
            }
        } else {
            user.setStore(null);
        }

        repo.save(user);
        return ApiResponse.success("Cập nhật vai trò người dùng thành công", mapToAdminDto(user));
    }

    public ApiResponse<String> deleteUserForAdmin(Long userId) {
        User user = repo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        // Thay đổi email và số điện thoại để tránh lỗi unique constraint nếu user đăng ký lại
        user.setEmail(user.getEmail() + "_deleted_" + System.currentTimeMillis());
        if (user.getPhone() != null) {
            user.setPhone(user.getPhone() + "_deleted_" + System.currentTimeMillis());
        }
        repo.save(user);

        repo.delete(user);
        return ApiResponse.success("Người dùng đã được xóa thành công", null);
    }

    public ApiResponse<List<AdminUserResponseDto>> getAllShippersForAdmin() {
        List<AdminUserResponseDto> shippers = repo.findByRoleOrderByNameAsc(Role.SHIPPER)
                .stream()
                .map(this::mapToAdminDto)
                .toList();
        return ApiResponse.success(shippers);
    }

    public ApiResponse<List<AdminUserResponseDto>> getStoreAdminsForAdmin() {
        List<AdminUserResponseDto> storeAdmins = repo.findByRoleOrderByNameAsc(Role.STORE_ADMIN)
                .stream()
                .map(this::mapToAdminDto)
                .toList();
        return ApiResponse.success(storeAdmins);
    }

    public ApiResponse<List<AdminUserResponseDto>> getShippersForRequester(Role requesterRole, Long requesterStoreId) {
        if (requesterRole == Role.SUPER_ADMIN) {
            return getAllShippersForAdmin();
        }
        if (requesterRole == Role.STORE_ADMIN && requesterStoreId != null) {
                List<AdminUserResponseDto> shippers = repo.findByRoleAndStoreId(Role.SHIPPER, requesterStoreId)
                    .stream()
                    .sorted(java.util.Comparator.comparing(User::getName, java.util.Comparator.nullsLast(String::compareToIgnoreCase)))
                    .map(this::mapToAdminDto)
                    .toList();
            return ApiResponse.success(shippers);
        }
        throw new BadRequestException("Không có quyền xem danh sách shipper");
    }

    public Map<String, Object> sendPasswordResetLink(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Vui lòng nhập email");
        }
        User user = repo.findByEmail(email.trim())
                .orElseThrow(() -> new BadRequestException("Email chưa được đăng ký"));

        // Generate a 16-char token
        String token = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        otpService.saveOTP("EMAIL_" + user.getEmail(), token);

        String resetLink = "http://localhost:5173/forgot-password?email=" + user.getEmail() + "&token=" + token;
        boolean mailSent = false;

        if (mailService.isConfigured()) {
            String subject = "Khôi phục mật khẩu tài khoản GoMart";
            String body = "<h3>Khôi phục mật khẩu</h3>"
                    + "<p>Chào " + user.getName() + ",</p>"
                    + "<p>Vui lòng click vào đường dẫn sau để đặt lại mật khẩu của bạn:</p>"
                    + "<p><a href='" + resetLink + "'>" + resetLink + "</a></p>"
                    + "<p>Link này sẽ hết hạn sau 2 phút.</p>";
            mailSent = mailService.sendHtmlMail(user.getEmail(), subject, body);
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("message", "Processed");
        result.put("mailSent", mailSent);
        // Fallback for local testing if SMTP not configured
        if (!mailSent) {
            result.put("resetLink", resetLink);
        }
        return result;
    }

    public void verifyResetToken(String email, String token) {
        if (email == null || token == null) {
            throw new BadRequestException("Thiếu thông tin xác thực");
        }
        boolean valid = otpService.verify("EMAIL_" + email.trim(), token.trim());
        if (!valid) {
            throw new BadRequestException("Link không hợp lệ hoặc đã hết hạn");
        }
    }

    public void resetPasswordByEmail(com.example.demo.dto.user.ResetPasswordWithEmailRequestDto req) {
        verifyResetToken(req.getEmail(), req.getToken());
        User user = repo.findByEmail(req.getEmail().trim())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        repo.save(user);

        otpService.clear("EMAIL_" + req.getEmail().trim());
    }

    private Store getSafeStore(User user) {
        if (user.getStore() == null) {
            return null;
        }
        try {
            // Trigger initialization of the lazy loading proxy
            user.getStore().getName();
            return user.getStore();
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return null;
        }
    }

    private AdminUserResponseDto mapToAdminDto(User user) {
        Store store = getSafeStore(user);
        return AdminUserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .storeId(store != null ? store.getId() : null)
                .storeName(store != null ? store.getName() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
    public ApiResponse<AuthResponseDto> getById(Long id){
        User user = repo.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User không tồn tại!"));
        return ApiResponse.success(mapToAuthDto(user));
    }

    private AuthResponseDto mapToAuthDto(User user) {
        Store store = getSafeStore(user);
        return AuthResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .province(user.getProvince())
                .district(user.getDistrict())
                .ward(user.getWard())
                .houseNumber(user.getHouseNumber())
                .avatar(user.getAvatar())
                .rewardStars(user.getRewardStars())
                .tier(user.getTier())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .storeId(store != null ? store.getId() : null)
                .storeName(store != null ? store.getName() : null)
                .build();
    }
}
