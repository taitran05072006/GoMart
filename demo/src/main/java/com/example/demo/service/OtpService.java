package com.example.demo.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
@Service
public class OtpService {
     private final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    private final Map<String, Long> expiryMap = new ConcurrentHashMap<>();

    private static final long EXPIRE_TIME = 2 * 60 * 1000; // 2 phút

    public void saveOTP(String phone, String otp) {
        otpStorage.put(phone, otp);
        expiryMap.put(phone, System.currentTimeMillis() + EXPIRE_TIME);
    }

    public boolean verify(String phone, String otp) {
        if (!otpStorage.containsKey(phone)) return false;

        if (System.currentTimeMillis() > expiryMap.get(phone)) {
            otpStorage.remove(phone);
            expiryMap.remove(phone);
            return false;
        }

        return otp.equals(otpStorage.get(phone));
    }

    public void clear(String phone) {
        otpStorage.remove(phone);
        expiryMap.remove(phone);
    }
}
