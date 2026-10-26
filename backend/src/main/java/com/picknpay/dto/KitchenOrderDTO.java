package com.picknpay.dto;

import com.picknpay.entity.KitchenOrderStatus;
import com.picknpay.entity.KitchenOrderType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class KitchenOrderDTO {

    private Long id;
    private Integer displayOrderNo;
    private KitchenOrderStatus status;
    private KitchenOrderType orderType;
    private Integer tableNumber;
    private BigDecimal totalAmount;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime preparedAt;
    private Long saleId;

    @NotEmpty
    @Valid
    private List<KitchenOrderItemDTO> items;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getDisplayOrderNo() {
        return displayOrderNo;
    }

    public void setDisplayOrderNo(Integer displayOrderNo) {
        this.displayOrderNo = displayOrderNo;
    }

    public KitchenOrderStatus getStatus() {
        return status;
    }

    public void setStatus(KitchenOrderStatus status) {
        this.status = status;
    }

    public KitchenOrderType getOrderType() {
        return orderType;
    }

    public void setOrderType(KitchenOrderType orderType) {
        this.orderType = orderType;
    }

    public Integer getTableNumber() {
        return tableNumber;
    }

    public void setTableNumber(Integer tableNumber) {
        this.tableNumber = tableNumber;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getPreparedAt() {
        return preparedAt;
    }

    public void setPreparedAt(LocalDateTime preparedAt) {
        this.preparedAt = preparedAt;
    }

    public Long getSaleId() {
        return saleId;
    }

    public void setSaleId(Long saleId) {
        this.saleId = saleId;
    }

    public List<KitchenOrderItemDTO> getItems() {
        return items;
    }

    public void setItems(List<KitchenOrderItemDTO> items) {
        this.items = items;
    }
}
