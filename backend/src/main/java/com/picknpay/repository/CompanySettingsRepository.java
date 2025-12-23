package com.picknpay.repository;

import com.picknpay.entity.CompanySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Long> {
    
    // Find the first company settings record (there should only be one)
    Optional<CompanySettings> findFirstByOrderByIdAsc();
}
