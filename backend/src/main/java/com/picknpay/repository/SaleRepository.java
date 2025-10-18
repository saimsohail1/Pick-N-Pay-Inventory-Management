package com.picknpay.repository;

import com.picknpay.entity.Sale;
import com.picknpay.entity.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    
    // Get all sales ordered by sale date descending
    List<Sale> findAllByOrderBySaleDateDesc();
    
    // Get sales by date range
    @Query("SELECT s FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get sales by user ID and date range
    @Query("SELECT s FROM Sale s WHERE s.user.id = :userId AND s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get sales by user ID
    @Query("SELECT s FROM Sale s WHERE s.user.id = :userId ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserId(@Param("userId") Long userId);
    
    // Get sales by date range for admin (all users)
    @Query("SELECT s FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByDateRangeForAdmin(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get total sales amount by date range
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    Double getTotalSalesByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get total sales amount by date range and payment method
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate AND s.paymentMethod = :paymentMethod")
    Double getTotalSalesByDateRangeAndPaymentMethod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("paymentMethod") PaymentMethod paymentMethod);
    
    // Get sales count by date range
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    Long getSalesCountByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get sales count by date range and payment method
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate AND s.paymentMethod = :paymentMethod")
    Long getSalesCountByDateRangeAndPaymentMethod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("paymentMethod") PaymentMethod paymentMethod);
    
    // Get sales by user ID and date range with payment method filter
    @Query("SELECT s FROM Sale s WHERE s.user.id = :userId AND s.saleDate BETWEEN :startDate AND :endDate AND s.paymentMethod = :paymentMethod ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserIdAndDateRangeAndPaymentMethod(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("paymentMethod") PaymentMethod paymentMethod);
}
