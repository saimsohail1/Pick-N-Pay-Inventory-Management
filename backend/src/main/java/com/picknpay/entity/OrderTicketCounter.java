package com.picknpay.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "order_ticket_counters")
public class OrderTicketCounter {

    @Id
    @Column(name = "business_date")
    private LocalDate businessDate;

    @Column(name = "last_no", nullable = false)
    private Integer lastNo;

    public OrderTicketCounter() {}

    public LocalDate getBusinessDate() {
        return businessDate;
    }

    public void setBusinessDate(LocalDate businessDate) {
        this.businessDate = businessDate;
    }

    public Integer getLastNo() {
        return lastNo;
    }

    public void setLastNo(Integer lastNo) {
        this.lastNo = lastNo;
    }
}
