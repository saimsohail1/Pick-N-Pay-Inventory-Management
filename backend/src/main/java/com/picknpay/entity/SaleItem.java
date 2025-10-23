package com.picknpay.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

@Entity
@Table(name = "sale_items")
public class SaleItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = true)
    private Item item;
    
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;
    
    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
    
    @NotNull(message = "Total price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total price must be greater than 0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;
    
    @NotBlank(message = "Item name is required")
    @Column(name = "item_name", nullable = false)
    private String itemName;
    
    @Column(name = "item_barcode")
    private String itemBarcode;
    
    @Column(name = "batch_id")
    private String batchId;
    
    @Column(name = "vat_rate", precision = 5, scale = 2, nullable = false)
    private BigDecimal vatRate;
    
    @Column(name = "vat_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal vatAmount;
    
    @Column(name = "price_excluding_vat", precision = 10, scale = 2, nullable = false)
    private BigDecimal priceExcludingVat;
    
    // Constructors
    public SaleItem() {}
    
    public SaleItem(Sale sale, Item item, Integer quantity, BigDecimal unitPrice) {
        this.sale = sale;
        this.item = item;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Sale getSale() {
        return sale;
    }
    
    public void setSale(Sale sale) {
        this.sale = sale;
    }
    
    public Item getItem() {
        return item;
    }
    
    public void setItem(Item item) {
        this.item = item;
    }
    
    public Integer getQuantity() {
        return quantity;
    }
    
    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        if (unitPrice != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }
    
    public BigDecimal getUnitPrice() {
        return unitPrice;
    }
    
    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
        if (quantity != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }
    
    public BigDecimal getTotalPrice() {
        return totalPrice;
    }
    
    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }
    
    public String getItemName() {
        return itemName;
    }
    
    public void setItemName(String itemName) {
        this.itemName = itemName;
    }
    
    public String getItemBarcode() {
        return itemBarcode;
    }
    
    public void setItemBarcode(String itemBarcode) {
        this.itemBarcode = itemBarcode;
    }
    
    public String getBatchId() {
        return batchId;
    }
    
    public void setBatchId(String batchId) {
        this.batchId = batchId;
    }
    
    public BigDecimal getVatRate() {
        return vatRate;
    }
    
    public void setVatRate(BigDecimal vatRate) {
        this.vatRate = vatRate;
    }
    
    public BigDecimal getVatAmount() {
        return vatAmount;
    }
    
    public void setVatAmount(BigDecimal vatAmount) {
        this.vatAmount = vatAmount;
    }
    
    public BigDecimal getPriceExcludingVat() {
        return priceExcludingVat;
    }
    
    public void setPriceExcludingVat(BigDecimal priceExcludingVat) {
        this.priceExcludingVat = priceExcludingVat;
    }
}
