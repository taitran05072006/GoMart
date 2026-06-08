package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.auth.*;
import com.example.demo.dto.user.ForgotPasswordEmailRequestDto;
import com.example.demo.dto.user.CreateAdminAccountRequestDto;
import com.example.demo.dto.user.ResetPasswordWithEmailRequestDto;
import com.example.demo.dto.user.VerifyResetTokenRequestDto;
import com.example.demo.dto.user.AdminUserResponseDto;
import com.example.demo.dto.user.UpdateUserRoleRequestDto;
import com.example.demo.service.UserService;
import com.example.demo.repository.UserRepository;
import com.example.demo.entity.User;
import com.example.demo.entity.Role;
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
    private final UserRepository userRepository;

    public AuthController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
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
        try {
            return userService.updateProfile(request);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ApiResponse.error("Update profile failed: " + ex.getMessage());
        }
    }
    @PutMapping("/change-password")
    public ApiResponse<String> changePassword(@RequestBody ChangePasswordRequestDto request){
        return userService.changePassword(request);
    }

    @GetMapping("/admin/customers")
    public ApiResponse<List<AdminUserResponseDto>> getAllCustomersForAdmin(@RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");
            return userService.getAllUsersForAdmin();
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @GetMapping("/admin/store-admins")
    public ApiResponse<List<AdminUserResponseDto>> getAllStoreAdminsForAdmin(@RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");
            return userService.getStoreAdminsForAdmin();
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @GetMapping("/admin/shippers")
    public ApiResponse<List<AdminUserResponseDto>> getAllShippersForAdmin(@RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null) return ApiResponse.error("Forbidden");
            if (u.getRole() == Role.SUPER_ADMIN || u.getRole() == Role.STORE_ADMIN) {
                return userService.getShippersForRequester(u.getRole(), u.getStore() != null ? u.getStore().getId() : null);
            }
            return ApiResponse.error("Forbidden");
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @PatchMapping("/admin/customers/{userId}/role")
    public ApiResponse<AdminUserResponseDto> updateUserRole(
            @PathVariable Long userId,
            @RequestBody UpdateUserRoleRequestDto request,
            @RequestHeader(value = "X-User-Id", required = false) String uid
    ) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null || u.getRole() != Role.SUPER_ADMIN) return ApiResponse.error("Forbidden");
            return userService.updateUserRole(userId, request);
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @PostMapping("/admin/accounts")
    public ApiResponse<AdminUserResponseDto> createAdminAccount(
            @RequestBody CreateAdminAccountRequestDto request,
            @RequestHeader(value = "X-User-Id", required = false) String uid,
            @RequestHeader(value = "X-Impersonate-Store-Id", required = false) String impersonatedStoreId
    ) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User requester = userRepository.findById(id).orElse(null);
            if (requester == null) return ApiResponse.error("Forbidden");
            if (requester.getRole() != Role.SUPER_ADMIN && requester.getRole() != Role.STORE_ADMIN) return ApiResponse.error("Forbidden");
            Long requestedStoreId = null;
            if (impersonatedStoreId != null && !impersonatedStoreId.isBlank()) {
                requestedStoreId = Long.parseLong(impersonatedStoreId);
            } else if (requester.getRole() != Role.SUPER_ADMIN && requester.getStore() != null) {
                requestedStoreId = requester.getStore().getId();
            }
            return userService.createAdminAccount(request, requester.getRole(), requester.getStore() != null ? requester.getStore().getId() : null, requestedStoreId);
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        } catch (RuntimeException ex) {
            return ApiResponse.error(ex.getMessage());
        }
    }

    @DeleteMapping("/admin/customers/{userId}")
    public ApiResponse<String> deleteUserForAdmin(@PathVariable Long userId, @RequestHeader(value = "X-User-Id", required = false) String uid) {
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null) return ApiResponse.error("Forbidden");

            // Allow SUPER_ADMIN to delete any user
            if (u.getRole() == Role.SUPER_ADMIN) {
                return userService.deleteUserForAdmin(userId);
            }

            // Allow STORE_ADMIN to delete shippers belonging to their store
            if (u.getRole() == Role.STORE_ADMIN) {
                User targetUser = userRepository.findById(userId).orElse(null);
                if (targetUser != null && targetUser.getRole() == Role.SHIPPER &&
                    u.getStore() != null && targetUser.getStore() != null &&
                    u.getStore().getId().equals(targetUser.getStore().getId())) {
                    return userService.deleteUserForAdmin(userId);
                }
            }

            return ApiResponse.error("Forbidden");
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
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