package com.example.demo.service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.auth.*;
import com.example.demo.dto.user.AdminUserResponseDto;
import com.example.demo.dto.user.ResetPasswordWithOtpRequestDto;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.exception.EmailAlreadyExistException;
import com.example.demo.exception.InvalidPasswordException;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UserNotFoundException;
import com.example.demo.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;
    private final OtpService otpService;
    private final SmsService smsService;
    private final MailService mailService;

    @Value("${otp.allow-without-sms:true}")
    private boolean allowOtpWithoutSms;

    @Value("${otp.debug-expose:true}")
    private boolean debugExposeOtp;

    public UserService(OtpService optService, SmsService smsService, MailService mailService, UserRepository repo, PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.smsService = smsService;
        this.otpService = optService;
        this.mailService = mailService;
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

        return ApiResponse.success("Cập nhật profile thành công!", mapToAuthDto(user));
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
        List<AdminUserResponseDto> users = repo.findAll().stream().map(this::mapToAdminDto).toList();
        return ApiResponse.success(users);
    }

    public ApiResponse<AdminUserResponseDto> updateUserRole(Long userId, String roleValue) {
        User user = repo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (roleValue == null || roleValue.isBlank()) {
            throw new IllegalArgumentException("Vai trò mới không được để trống");
        }

        Role role;
        try {
            role = Role.valueOf(roleValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Các giá trị cho phép: ADMIN, CUSTORMER, SHIPPER");
        }

        user.setRole(role);
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

    public String sendOtp(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Vui lòng nhập số điện thoại");
        }

        User user = findUserByPhoneFlexible(phone)
                .orElseThrow(() -> new BadRequestException("Số điện thoại chưa được đăng ký"));

        String canonicalPhone = user.getPhone();

        String otp = String.valueOf(new Random().nextInt(900000) + 100000);

        otpService.saveOTP(canonicalPhone, otp);

        try {
            smsService.send(formatPhoneForSms(canonicalPhone), "OTP của bạn là: " + otp);
        } catch (Exception e) {
            log.error("Failed to send OTP to phone {}", canonicalPhone, e);
            if (!allowOtpWithoutSms) {
                throw new BadRequestException("Không gửi được OTP qua SMS. Vui lòng kiểm tra lại số điện thoại.");
            }
            log.warn("SMS failed but OTP fallback is enabled. phone={}, otp={}", canonicalPhone, otp);
        }

        return otp;
    }

    public void resetPasswordByOtp(ResetPasswordWithOtpRequestDto req) {

        if (req == null || req.getPhone() == null || req.getPhone().isBlank()) {
            throw new BadRequestException("Vui lòng nhập số điện thoại");
        }

        User user = findUserByPhoneFlexible(req.getPhone())
                .orElseThrow(() -> new BadRequestException("Số điện thoại chưa được đăng ký"));

        String canonicalPhone = user.getPhone();

        boolean valid = otpService.verify(canonicalPhone, req.getOtp());

        // Backward compatibility for OTPs generated before canonical phone normalization.
        if (!valid) {
            valid = otpService.verify(req.getPhone(), req.getOtp());
        }

        if (!valid) {
            throw new BadRequestException("OTP không hợp lệ hoặc đã hết hạn");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        repo.save(user);

        // xoá OTP sau khi dùng (quan trọng)
        otpService.clear(canonicalPhone);
        otpService.clear(req.getPhone());
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

    private Optional<User> findUserByPhoneFlexible(String phone) {
        String normalized = phone.trim();
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(normalized);

        String digitsOnly = normalized.replaceAll("\\D", "");
        if (!digitsOnly.isBlank()) {
            candidates.add(digitsOnly);

            if (digitsOnly.startsWith("84") && digitsOnly.length() > 2) {
                String local = "0" + digitsOnly.substring(2);
                candidates.add(local);
                candidates.add("+84" + digitsOnly.substring(2));
            }

            if (digitsOnly.startsWith("0") && digitsOnly.length() > 1) {
                String intlSuffix = digitsOnly.substring(1);
                candidates.add("+84" + intlSuffix);
                candidates.add("84" + intlSuffix);
            }

            if (!digitsOnly.startsWith("0") && !digitsOnly.startsWith("84")) {
                candidates.add("0" + digitsOnly);
                candidates.add("+84" + digitsOnly);
                candidates.add("84" + digitsOnly);
            }
        }

        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) continue;
            Optional<User> matched = repo.findByPhone(candidate);
            if (matched.isPresent()) {
                return matched;
            }
        }

        return Optional.empty();
    }

    private String formatPhoneForSms(String phone) {
        String normalized = phone.trim();
        if (normalized.startsWith("+")) {
            return normalized;
        }
        if (normalized.startsWith("84")) {
            return "+" + normalized;
        }
        if (normalized.startsWith("0")) {
            return "+84" + normalized.substring(1);
        }
        return normalized;
    }

    public boolean isDebugExposeOtpEnabled() {
        return debugExposeOtp;
    }

    private AdminUserResponseDto mapToAdminDto(User user) {
        return AdminUserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .build();
    }
    public ApiResponse<AuthResponseDto> getById(Long id){
        User user = repo.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User không tồn tại!"));
        return ApiResponse.success(mapToAuthDto(user));
    }

    private AuthResponseDto mapToAuthDto(User user) {
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
                .build();
    }
}