package com.example.demo.service;

import com.example.demo.entity.Region;
import com.example.demo.entity.Store;
import com.example.demo.repository.RegionRepository;
import com.example.demo.repository.StoreRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class RegionDetectionService {
    private final RegionRepository regionRepository;
    private final StoreRepository storeRepository;

    public RegionDetectionService(RegionRepository regionRepository, StoreRepository storeRepository) {
        this.regionRepository = regionRepository;
        this.storeRepository = storeRepository;
    }

    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        n = n.replaceAll("\\p{M}", ""); // remove diacritics
        n = n.replace('đ', 'd').replace('Đ', 'd');
        return n.toLowerCase(Locale.ROOT).trim();
    }

    public Region detectRegionByAddress(String address) {
        if (address == null || address.isBlank()) return null;
        String normAddr = normalize(address);
        List<Region> regions = regionRepository.findAll();
        for (Region r : regions) {
            if (r.getName() == null) continue;
            String rn = normalize(r.getName());
            if (rn.length() == 0) continue;
            if (normAddr.contains(rn)) return r;
        }
        String[] tokens = normAddr.split("\\s+");
        for (Region r : regions) {
            String rn = normalize(r.getName());
            for (String t : tokens) {
                if (t.equals(rn)) return r;
            }
        }
        return null;
    }

    public List<Store> storesByAddress(String address) {
        Region r = detectRegionByAddress(address);
        if (r == null) return List.of();
        return storeRepository.findByRegionId(r.getId());
    }
}
