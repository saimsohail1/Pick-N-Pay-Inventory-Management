package com.picknpay.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CategoryDTO {
    private Long id;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean displayOnPos;
    private java.math.BigDecimal vatRate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public CategoryDTO() {}

    public CategoryDTO(Long id, String name, String description, Boolean isActive, 
                      Boolean displayOnPos, java.math.BigDecimal vatRate, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.isActive = isActive;
        this.displayOnPos = displayOnPos;
        this.vatRate = vatRate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Boolean getDisplayOnPos() {
        return displayOnPos;
    }

    public void setDisplayOnPos(Boolean displayOnPos) {
        this.displayOnPos = displayOnPos;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public java.math.BigDecimal getVatRate() {
        return vatRate;
    }

    public void setVatRate(java.math.BigDecimal vatRate) {
        this.vatRate = vatRate;
    }

}