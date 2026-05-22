package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.auth.*;
import com.example.demo.dto.user.ForgotPasswordEmailRequestDto;
import com.example.demo.dto.user.ResetPasswordWithEmailRequestDto;
import com.example.demo.dto.user.VerifyResetTokenRequestDto;
import com.example.demo.dto.user.AdminUserResponseDto;
import com.example.demo.dto.user.ForgotPasswordRequestDto;
import com.example.demo.dto.user.ResetPasswordWithOtpRequestDto;
import com.example.demo.dto.user.UpdateUserRoleRequestDto;
import com.example.demo.service.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponseDto> register(@RequestBody RegisterRequestDtoDto request){
        return userService.register(request);
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponseDto> login(@RequestBody LoginRequestDto request){
        return userService.login(request);
    }
    @PutMapping("/profile")
    public ApiResponse<AuthResponseDto> updateProfile(@RequestBody UpdateProfileRequestDto request){
        return userService.updateProfile(request);
    }
    @PutMapping("/change-password")
    public ApiResponse<String> changePassword(@RequestBody ChangePasswordRequestDto request){
        return userService.changePassword(request);
    }

    @GetMapping("/admin/customers")
    public ApiResponse<List<AdminUserResponseDto>> getAllCustomersForAdmin() {
        return userService.getAllUsersForAdmin();
    }

    @GetMapping("/admin/shippers")
    public ApiResponse<List<AdminUserResponseDto>> getAllShippersForAdmin() {
        return userService.getAllShippersForAdmin();
    }

    @PatchMapping("/admin/customers/{userId}/role")
    public ApiResponse<AdminUserResponseDto> updateUserRole(
            @PathVariable Long userId,
            @RequestBody UpdateUserRoleRequestDto request
    ) {
        return userService.updateUserRole(userId, request.getRole());
    }

    @DeleteMapping("/admin/customers/{userId}")
    public ApiResponse<String> deleteUserForAdmin(@PathVariable Long userId) {
        return userService.deleteUserForAdmin(userId);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOTP(@RequestBody ForgotPasswordRequestDto request) {
        String otp = userService.sendOtp(request.getPhone());
        Map<String, Object> payload = new HashMap<>();
        payload.put("message", "OTP sent");

        if (userService.isDebugExposeOtpEnabled()) {
            payload.put("otp", otp);
        }

        return ResponseEntity.ok(payload);
    }

    @PostMapping("/reset-password-otp")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordWithOtpRequestDto request) {
        userService.resetPasswordByOtp(request);
        return ResponseEntity.ok("Password updated");
    }

    @PostMapping("/send-password-reset-link")
    public ResponseEntity<?> sendPasswordResetLink(@RequestBody ForgotPasswordEmailRequestDto request) {
        Map<String, Object> result = userService.sendPasswordResetLink(request.getEmail());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-reset-token")
    public ResponseEntity<?> verifyResetToken(@RequestBody VerifyResetTokenRequestDto request) {
        userService.verifyResetToken(request.getEmail(), request.getToken());
        return ResponseEntity.ok(Map.of("message", "Token hợp lệ"));
    }

    @PostMapping("/reset-password-email")
    public ResponseEntity<?> resetPasswordByEmail(@RequestBody ResetPasswordWithEmailRequestDto request) {
        userService.resetPasswordByEmail(request);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
    }
    @GetMapping("/{id}")
    public ApiResponse<AuthResponseDto> getById(@PathVariable Long id){
        return userService.getById(id);
    }

}