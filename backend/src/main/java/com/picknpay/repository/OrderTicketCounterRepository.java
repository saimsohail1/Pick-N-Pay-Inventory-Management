package com.picknpay.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;

@Repository
public class OrderTicketCounterRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public int allocateNext(LocalDate day) {
        Number next = (Number) entityManager.createNativeQuery(
                "INSERT INTO order_ticket_counters (business_date, last_no) VALUES (?1, 1) "
                        + "ON CONFLICT (business_date) DO UPDATE "
                        + "SET last_no = CASE "
                        + "WHEN order_ticket_counters.last_no >= 99 THEN 1 "
                        + "ELSE order_ticket_counters.last_no + 1 END "
                        + "RETURNING last_no"
        ).setParameter(1, Date.valueOf(day)).getSingleResult();
        return next.intValue();
    }
}
