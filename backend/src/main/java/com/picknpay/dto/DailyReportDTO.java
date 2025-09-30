package com.picknpay.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DailyReportDTO {
    private LocalDate reportDate;
    private Long totalSales;
    private BigDecimal totalAmount;
    private Long cashSales;
    private BigDecimal cashAmount;
    private Long cardSales;
    private BigDecimal cardAmount;

    // Constructors
    public DailyReportDTO() {}

    public DailyReportDTO(LocalDate reportDate, Long totalSales, BigDecimal totalAmount, 
                         Long cashSales, BigDecimal cashAmount, Long cardSales, BigDecimal cardAmount) {
        this.reportDate = reportDate;
        this.totalSales = totalSales;
        this.totalAmount = totalAmount;
        this.cashSales = cashSales;
        this.cashAmount = cashAmount;
        this.cardSales = cardSales;
        this.cardAmount = cardAmount;
    }

    // Getters and Setters
    public LocalDate getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }

    public Long getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(Long totalSales) {
        this.totalSales = totalSales;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Long getCashSales() {
        return cashSales;
    }

    public void setCashSales(Long cashSales) {
        this.cashSales = cashSales;
    }

    public BigDecimal getCashAmount() {
        return cashAmount;
    }

    public void setCashAmount(BigDecimal cashAmount) {
        this.cashAmount = cashAmount;
    }

    public Long getCardSales() {
        return cardSales;
    }

    public void setCardSales(Long cardSales) {
        this.cardSales = cardSales;
    }

    public BigDecimal getCardAmount() {
        return cardAmount;
    }

    public void setCardAmount(BigDecimal cardAmount) {
        this.cardAmount = cardAmount;
    }
}
