package com.example.demo.service;

import com.example.demo.entity.ShippingFee;
import com.example.demo.entity.ShippingConfig;
import com.example.demo.entity.Store;
import com.example.demo.repository.ShippingConfigRepository;
import com.example.demo.repository.ShippingFeeRepository;
import com.example.demo.repository.StoreRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShippingService {

    private final ShippingFeeRepository repository;
    private final StoreRepository storeRepository;
    private final ShippingConfigRepository configRepository;

    public ShippingService(ShippingFeeRepository repository, StoreRepository storeRepository, ShippingConfigRepository configRepository) {
        this.repository = repository;
        this.storeRepository = storeRepository;
        this.configRepository = configRepository;
    }

    public Double calculateShippingFee(String address, Double subtotal) {
        if (address == null || address.trim().isEmpty()) {
            return 0.0;
        }

        ShippingConfig cfg = (configRepository != null) ? configRepository.findFirstByOrderByIdAsc().orElse(null) : null;
        double freeThreshold = cfg != null && cfg.getFreeThreshold() != null ? cfg.getFreeThreshold() : 500000.0;
        if (subtotal != null && subtotal >= freeThreshold) {
            return 0.0;
        }

        String normalizedAddress = address.trim().toLowerCase();
        // Normalize input address tokens for matching
        String addr = normalizedAddress;

        // Fetch all configured shipping fees and try exact matches (ignore case)
        List<ShippingFee> fees = repository.findAll();

        // 1) Exact match province + district + ward
        for (ShippingFee f : fees) {
            if (f.getProvince() != null && f.getDistrict() != null && f.getWard() != null) {
                String p = f.getProvince().trim().toLowerCase();
                String d = f.getDistrict().trim().toLowerCase();
                String w = f.getWard().trim().toLowerCase();
                if (!p.isEmpty() && !d.isEmpty() && !w.isEmpty()) {
                    if (addr.contains(p) && addr.contains(d) && addr.contains(w)) {
                        return f.getFee();
                    }
                }
            }
        }

        // 2) Exact match province + district
        for (ShippingFee f : fees) {
            if (f.getProvince() != null && f.getDistrict() != null) {
                String p = f.getProvince().trim().toLowerCase();
                String d = f.getDistrict().trim().toLowerCase();
                if (!p.isEmpty() && !d.isEmpty()) {
                    if (addr.contains(p) && addr.contains(d)) {
                        return f.getFee();
                    }
                }
            }
        }

        // 3) Exact match province only
        for (ShippingFee f : fees) {
            if (f.getProvince() != null) {
                String p = f.getProvince().trim().toLowerCase();
                if (!p.isEmpty() && addr.contains(p)) {
                    return f.getFee();
                }
            }
        }

        // Default: fall back to flat 35k if shipping_fees table unused
        return 35000.0;
    }

    public Double calculateShippingFeeByCoordinates(Double lat, Double lng, Double subtotal, Long storeId) {
        if (lat == null || lng == null) return calculateShippingFee(null, subtotal);
        ShippingConfig cfg2 = (configRepository != null) ? configRepository.findFirstByOrderByIdAsc().orElse(null) : null;
        double freeThreshold2 = cfg2 != null && cfg2.getFreeThreshold() != null ? cfg2.getFreeThreshold() : 500000.0;
        if (subtotal != null && subtotal >= freeThreshold2) return 0.0;

        Store chosen = null;
        if (storeId != null) {
            chosen = storeRepository.findById(storeId).orElse(null);
        }

        if (chosen == null) {
            // find nearest store with coords
            double bestDist = Double.MAX_VALUE;
            for (Store s : storeRepository.findAll()) {
                if (s.getLatitude() == null || s.getLongitude() == null) continue;
                double d = haversineMeters(lat, lng, s.getLatitude(), s.getLongitude()) / 1000.0; // km
                if (d < bestDist) {
                    bestDist = d; chosen = s;
                }
            }
        }

        if (chosen == null || chosen.getLatitude() == null || chosen.getLongitude() == null) {
            double base = cfg2 != null && cfg2.getBaseFee() != null ? cfg2.getBaseFee() : 15000.0;
            return base; // fallback
        }

        double distanceKm = haversineMeters(lat, lng, chosen.getLatitude(), chosen.getLongitude()) / 1000.0;
        double perKm = cfg2 != null && cfg2.getPerKmRate() != null ? cfg2.getPerKmRate() : 3000.0;
        double base = cfg2 != null && cfg2.getBaseFee() != null ? cfg2.getBaseFee() : 15000.0;
        double freeKm = cfg2 != null && cfg2.getFreeKm() != null ? cfg2.getFreeKm() : 1.0;
        // Fee = base_fee + per_km_rate * max(0, distanceKm - freeKm)
        double fee = base + perKm * Math.max(0.0, distanceKm - freeKm);
        return Double.valueOf(Math.round(fee));
    }

    private static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}
