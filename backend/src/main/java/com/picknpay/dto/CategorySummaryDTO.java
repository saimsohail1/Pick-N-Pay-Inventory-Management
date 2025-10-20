package com.picknpay.dto;

import java.math.BigDecimal;

public class CategorySummaryDTO {
    private String name;
    private BigDecimal total;
    private Long count;

    // Constructors
    public CategorySummaryDTO() {}

    public CategorySummaryDTO(String name, BigDecimal total, Long count) {
        this.name = name;
        this.total = total;
        this.count = count;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }
}
