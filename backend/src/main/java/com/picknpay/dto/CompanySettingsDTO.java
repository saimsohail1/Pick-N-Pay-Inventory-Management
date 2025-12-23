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

    @Size(max = 10, message = "Eircode must not exceed 10 characters")
    private String eircode;

    @Size(max = 50, message = "VAT Number must not exceed 50 characters")
    private String vatNumber;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 255, message = "Website must not exceed 255 characters")
    private String website;

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

    public CompanySettingsDTO(Long id, String companyName, String address, String eircode, String vatNumber) {
        this.id = id;
        this.companyName = companyName;
        this.address = address;
        this.eircode = eircode;
        this.vatNumber = vatNumber;
    }

    public CompanySettingsDTO(Long id, String companyName, String address, String eircode, String vatNumber, String phone, String website) {
        this.id = id;
        this.companyName = companyName;
        this.address = address;
        this.eircode = eircode;
        this.vatNumber = vatNumber;
        this.phone = phone;
        this.website = website;
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

    public String getEircode() {
        return eircode;
    }

    public void setEircode(String eircode) {
        this.eircode = eircode;
    }

    public String getVatNumber() {
        return vatNumber;
    }

    public void setVatNumber(String vatNumber) {
        this.vatNumber = vatNumber;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }
}
