package com.picknpay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class BatchDTO {
    
    private Long id;
    
    @NotNull(message = "Product ID is required")
    private Long productId;
    
    @NotBlank(message = "Batch ID is required")
    private String batchId;
    
    private LocalDate expiryDate;
    
    private LocalDate manufactureDate;
    
    @NotNull(message = "Quantity is required")
    private Integer quantity;
    
    private LocalDate receivedDate;
    
    private String supplierId;
    
    // Additional fields for display
    private String productName;
    private String productBarcode;
    
    // Constructors
    public BatchDTO() {}
    
    public BatchDTO(Long productId, String batchId, LocalDate expiryDate, Integer quantity) {
        this.productId = productId;
        this.batchId = batchId;
        this.expiryDate = expiryDate;
        this.quantity = quantity;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getProductId() {
        return productId;
    }
    
    public void setProductId(Long productId) {
        this.productId = productId;
    }
    
    public String getBatchId() {
        return batchId;
    }
    
    public void setBatchId(String batchId) {
        this.batchId = batchId;
    }
    
    public LocalDate getExpiryDate() {
        return expiryDate;
    }
    
    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }
    
    public LocalDate getManufactureDate() {
        return manufactureDate;
    }
    
    public void setManufactureDate(LocalDate manufactureDate) {
        this.manufactureDate = manufactureDate;
    }
    
    public Integer getQuantity() {
        return quantity;
    }
    
    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
    
    public LocalDate getReceivedDate() {
        return receivedDate;
    }
    
    public void setReceivedDate(LocalDate receivedDate) {
        this.receivedDate = receivedDate;
    }
    
    public String getSupplierId() {
        return supplierId;
    }
    
    public void setSupplierId(String supplierId) {
        this.supplierId = supplierId;
    }
    
    public String getProductName() {
        return productName;
    }
    
    public void setProductName(String productName) {
        this.productName = productName;
    }
    
    public String getProductBarcode() {
        return productBarcode;
    }
    
    public void setProductBarcode(String productBarcode) {
        this.productBarcode = productBarcode;
    }
}
