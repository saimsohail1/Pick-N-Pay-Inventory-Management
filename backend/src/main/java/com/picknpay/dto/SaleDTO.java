package com.picknpay.dto;

import com.picknpay.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class SaleDTO {
    
    private Long id;
    
    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total amount must be greater than 0")
    private BigDecimal totalAmount;
    
    private LocalDateTime saleDate;
    
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    
    @NotEmpty(message = "Sale items are required")
    private List<SaleItemDTO> saleItems;
    
    private Long userId;
    
    // Constructors
    public SaleDTO() {}
    
    public SaleDTO(BigDecimal totalAmount, PaymentMethod paymentMethod, List<SaleItemDTO> saleItems) {
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod;
        this.saleItems = saleItems;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
    
    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public LocalDateTime getSaleDate() {
        return saleDate;
    }
    
    public void setSaleDate(LocalDateTime saleDate) {
        this.saleDate = saleDate;
    }
    
    public List<SaleItemDTO> getSaleItems() {
        return saleItems;
    }
    
    public void setSaleItems(List<SaleItemDTO> saleItems) {
        this.saleItems = saleItems;
    }
    
    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }
    
    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
