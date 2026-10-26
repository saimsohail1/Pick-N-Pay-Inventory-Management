package com.picknpay.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kitchen_orders")
public class KitchenOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_order_no", nullable = false)
    private Integer displayOrderNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private KitchenOrderStatus status = KitchenOrderStatus.PREPARING;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "prepared_at")
    private LocalDateTime preparedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "sale_id")
    private Long saleId;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @OneToMany(mappedBy = "kitchenOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<KitchenOrderItem> items = new ArrayList<>();

    public KitchenOrder() {
        this.createdAt = LocalDateTime.now();
        this.status = KitchenOrderStatus.PREPARING;
    }

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

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public Long getSaleId() {
        return saleId;
    }

    public void setSaleId(Long saleId) {
        this.saleId = saleId;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public List<KitchenOrderItem> getItems() {
        return items;
    }

    public void setItems(List<KitchenOrderItem> items) {
        this.items = items;
    }
}
