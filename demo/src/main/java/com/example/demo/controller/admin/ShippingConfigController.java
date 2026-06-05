package com.example.demo.controller.admin;

import com.example.demo.entity.ShippingConfig;
import com.example.demo.repository.ShippingConfigRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.entity.User;
import com.example.demo.entity.Role;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/admin/shipping-config")
public class ShippingConfigController {

    private final ShippingConfigRepository repository;
    private final UserRepository userRepository;

    public ShippingConfigController(ShippingConfigRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ShippingConfig> getConfig(HttpServletRequest request) {
        String uid = request.getHeader("X-User-Id");
        if (uid == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        try {
            Long id = Long.parseLong(uid);
            Optional<User> uo = userRepository.findById(id);
            if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            User u = uo.get();
            if (!(u.getRole() == Role.SUPER_ADMIN || u.getRole() == Role.STORE_ADMIN)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        } catch (NumberFormatException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<ShippingConfig> cfg = repository.findFirstByOrderByIdAsc();
        return ResponseEntity.of(cfg);
    }

    @PutMapping
    public ResponseEntity<ShippingConfig> updateConfig(@RequestBody ShippingConfig input, HttpServletRequest request) {
        String uid = request.getHeader("X-User-Id");
        if (uid == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        try {
            Long id = Long.parseLong(uid);
            Optional<User> uo = userRepository.findById(id);
            if (uo.isEmpty()) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            User u = uo.get();
            if (!(u.getRole() == Role.SUPER_ADMIN || u.getRole() == Role.STORE_ADMIN)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        } catch (NumberFormatException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }


        Optional<ShippingConfig> existing = repository.findFirstByOrderByIdAsc();
        ShippingConfig cfg;
        if (existing.isPresent()) {
            cfg = existing.get();
            if (input.getPerKmRate() != null) cfg.setPerKmRate(input.getPerKmRate());
            if (input.getBaseFee() != null) cfg.setBaseFee(input.getBaseFee());
            if (input.getFreeKm() != null) cfg.setFreeKm(input.getFreeKm());
            if (input.getFreeThreshold() != null) cfg.setFreeThreshold(input.getFreeThreshold());
        } else {
            cfg = new ShippingConfig();
            cfg.setPerKmRate(input.getPerKmRate());
            cfg.setBaseFee(input.getBaseFee());
            cfg.setFreeKm(input.getFreeKm());
            cfg.setFreeThreshold(input.getFreeThreshold());
        }

        ShippingConfig saved = repository.save(cfg);
        return ResponseEntity.ok(saved);
    }
}
