package com.picknpay.service;

import com.picknpay.dto.CompanySettingsDTO;
import com.picknpay.entity.CompanySettings;
import com.picknpay.repository.CompanySettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@Transactional
public class CompanySettingsService {

    @Autowired
    private CompanySettingsRepository companySettingsRepository;

    @Value("${app.b2b-mode:false}")
    private boolean b2bMode;

    public CompanySettingsDTO getCompanySettings() {
        Optional<CompanySettings> settingsOpt = companySettingsRepository.findFirstByOrderByIdAsc();
        CompanySettings settings;
        
        if (settingsOpt.isEmpty()) {
            // Create default settings if none exist
            settings = new CompanySettings("Inventory System", "");
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
            settings.setQuotationFooterText(settingsDTO.getQuotationFooterText());
        } else {
            // Update existing settings
            settings = settingsOpt.get();
            settings.setCompanyName(settingsDTO.getCompanyName());
            settings.setAddress(settingsDTO.getAddress());
            settings.setQuotationFooterText(settingsDTO.getQuotationFooterText());
        }
        
        settings = companySettingsRepository.save(settings);
        return convertToDTO(settings);
    }

    private CompanySettingsDTO convertToDTO(CompanySettings settings) {
        CompanySettingsDTO dto = new CompanySettingsDTO(settings.getId(), settings.getCompanyName(), settings.getAddress());
        dto.setQuotationFooterText(settings.getQuotationFooterText());
        dto.setIncludeVatInReports(!b2bMode);
        return dto;
    }
}
