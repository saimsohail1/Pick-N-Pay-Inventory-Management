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
    
    @Query("SELECT s FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByDateRange(@Param("startDate") LocalDateTime startDate, 
                                   @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT s FROM Sale s ORDER BY s.saleDate DESC")
    List<Sale> findAllOrderBySaleDateDesc();
    
    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    Double getTotalSalesByDateRange(@Param("startDate") LocalDateTime startDate, 
                                   @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    Long getSalesCountByDateRange(@Param("startDate") LocalDateTime startDate, 
                                 @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate AND s.paymentMethod = :paymentMethod")
    Double getTotalSalesByDateRangeAndPaymentMethod(@Param("startDate") LocalDateTime startDate, 
                                                   @Param("endDate") LocalDateTime endDate,
                                                   @Param("paymentMethod") PaymentMethod paymentMethod);
    
    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate AND s.paymentMethod = :paymentMethod")
    Long getSalesCountByDateRangeAndPaymentMethod(@Param("startDate") LocalDateTime startDate, 
                                                 @Param("endDate") LocalDateTime endDate,
                                                 @Param("paymentMethod") PaymentMethod paymentMethod);
    
    // New methods for user-based filtering
    @Query("SELECT s FROM Sale s WHERE s.userId = :userId AND s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserIdAndDateRange(@Param("userId") Long userId, 
                                            @Param("startDate") LocalDateTime startDate, 
                                            @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT s FROM Sale s WHERE s.userId = :userId ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserId(@Param("userId") Long userId);
    
    @Query("SELECT s FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByDateRangeForAdmin(@Param("startDate") LocalDateTime startDate, 
                                           @Param("endDate") LocalDateTime endDate);
}
