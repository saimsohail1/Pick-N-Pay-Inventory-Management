package com.picknpay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CompanySettingsDTO {

    private Long id;

    @NotBlank(message = "Company name is required")
    @Size(min = 1, max = 100, message = "Company name must be between 1 and 100 characters")
    private String companyName;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    // Constructors
    public CompanySettingsDTO() {}

    public CompanySettingsDTO(String companyName) {
        this.companyName = companyName;
    }

    public CompanySettingsDTO(String companyName, String address) {
        this.companyName = companyName;
        this.address = address;
    }

    public CompanySettingsDTO(Long id, String companyName, String address) {
        this.id = id;
        this.companyName = companyName;
        this.address = address;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
