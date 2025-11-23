package com.picknpay.dto;

import java.math.BigDecimal;

public class VatSummaryDTO {
    private BigDecimal vatRate; // VAT rate as percentage (e.g., 23.00 for 23%)
    private BigDecimal gross; // Total amount including VAT for this rate
    private BigDecimal vatAmount; // Total VAT amount for this rate
    private BigDecimal net; // Total amount excluding VAT for this rate

    // Constructors
    public VatSummaryDTO() {}

    public VatSummaryDTO(BigDecimal vatRate, BigDecimal gross, BigDecimal vatAmount, BigDecimal net) {
        this.vatRate = vatRate;
        this.gross = gross;
        this.vatAmount = vatAmount;
        this.net = net;
    }

    // Getters and Setters
    public BigDecimal getVatRate() {
        return vatRate;
    }

    public void setVatRate(BigDecimal vatRate) {
        this.vatRate = vatRate;
    }

    public BigDecimal getGross() {
        return gross;
    }

    public void setGross(BigDecimal gross) {
        this.gross = gross;
    }

    public BigDecimal getVatAmount() {
        return vatAmount;
    }

    public void setVatAmount(BigDecimal vatAmount) {
        this.vatAmount = vatAmount;
    }

    public BigDecimal getNet() {
        return net;
    }

    public void setNet(BigDecimal net) {
        this.net = net;
    }
}

