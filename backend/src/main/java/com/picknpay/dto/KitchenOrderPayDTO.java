package com.picknpay.dto;

import com.picknpay.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class KitchenOrderPayDTO {

    @NotNull
    private PaymentMethod paymentMethod;

    private List<SalePaymentDTO> paymentSplits;
    private Long userId;

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public List<SalePaymentDTO> getPaymentSplits() {
        return paymentSplits;
    }

    public void setPaymentSplits(List<SalePaymentDTO> paymentSplits) {
        this.paymentSplits = paymentSplits;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
