package com.picknpay.controller;

import com.picknpay.dto.CompanySettingsDTO;
import com.picknpay.service.CompanySettingsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company-settings")
@CrossOrigin(origins = "*")
public class CompanySettingsController {

    @Autowired
    private CompanySettingsService companySettingsService;

    @GetMapping
    public ResponseEntity<CompanySettingsDTO> getCompanySettings() {
        CompanySettingsDTO settings = companySettingsService.getCompanySettings();
        return ResponseEntity.ok(settings);
    }

    @PutMapping
    public ResponseEntity<CompanySettingsDTO> updateCompanySettings(@Valid @RequestBody CompanySettingsDTO settingsDTO) {
        try {
            CompanySettingsDTO updatedSettings = companySettingsService.updateCompanySettings(settingsDTO);
            return ResponseEntity.ok(updatedSettings);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
 