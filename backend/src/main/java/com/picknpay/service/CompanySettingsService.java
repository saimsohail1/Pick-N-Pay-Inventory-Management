package com.picknpay.service;

import com.picknpay.dto.CompanySettingsDTO;
import com.picknpay.entity.CompanySettings;
import com.picknpay.repository.CompanySettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@Transactional
public class CompanySettingsService {

    @Autowired
    private CompanySettingsRepository companySettingsRepository;

    public CompanySettingsDTO getCompanySettings() {
        Optional<CompanySettings> settingsOpt = companySettingsRepository.findFirstByOrderByIdAsc();
        CompanySettings settings;
        
        if (settingsOpt.isEmpty()) {
            // Create default settings if none exist
            settings = new CompanySettings("PickNPay", "");
            settings = companySettingsRepository.save(settings);
        } else {
            settings = settingsOpt.get();
        }
        return convertToDTO(settings);
    }

    public CompanySettingsDTO updateCompanySettings(CompanySettingsDTO settingsDTO) {
        Optional<CompanySettings> settingsOpt = companySettingsRepository.findFirstByOrderByIdAsc();
        CompanySettings settings;
        
        if (settingsOpt.isEmpty()) {
            // Create new settings if none exist
            settings = new CompanySettings(settingsDTO.getCompanyName(), settingsDTO.getAddress());
        } else {
            // Update existing settings
            settings = settingsOpt.get();
            settings.setCompanyName(settingsDTO.getCompanyName());
            settings.setAddress(settingsDTO.getAddress());
        }
        
        settings = companySettingsRepository.save(settings);
        return convertToDTO(settings);
    }

    private CompanySettingsDTO convertToDTO(CompanySettings settings) {
        return new CompanySettingsDTO(settings.getId(), settings.getCompanyName(), settings.getAddress());
    }
}
