package com.picknpay.repository;

import com.picknpay.dto.CategorySummaryDTO;
import com.picknpay.dto.VatSummaryDTO;
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
    
    // Get sales by date range with salePayments eagerly fetched (for daily reports)
    @Query("SELECT DISTINCT s FROM Sale s LEFT JOIN FETCH s.salePayments WHERE s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByDateRangeWithPayments(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Aggregated report queries (no entity load) — used by Z-Report.
    // These run GROUP BY on PostgreSQL and return at most a few dozen rows
    // total instead of pulling every sale + sale_item + item into memory.
    // ─────────────────────────────────────────────────────────────────────────

    // Payment-method summary: returns one row per PaymentMethod with
    // [paymentMethod, count, sumTotal]. Always at most ~3 rows (CASH/CARD/SPLIT).
    @Query("SELECT s.paymentMethod, COUNT(s), COALESCE(SUM(s.totalAmount), 0) " +
           "FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY s.paymentMethod")
    List<Object[]> aggregatePaymentMethods(@Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate);

    @Query("SELECT s.paymentMethod, COUNT(s), COALESCE(SUM(s.totalAmount), 0) " +
           "FROM Sale s " +
           "WHERE s.user.id = :userId AND s.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY s.paymentMethod")
    List<Object[]> aggregatePaymentMethodsByUser(@Param("userId") Long userId,
                                                 @Param("startDate") LocalDateTime startDate,
                                                 @Param("endDate") LocalDateTime endDate);

    // Split-payment breakdown: amounts for sales whose top-level method is SPLIT,
    // grouped by the inner sale_payments.payment_method. Always at most 2 rows.
    @Query("SELECT sp.paymentMethod, COALESCE(SUM(sp.amount), 0) " +
           "FROM SalePayment sp " +
           "WHERE sp.sale.paymentMethod = com.picknpay.entity.PaymentMethod.SPLIT " +
           "  AND sp.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY sp.paymentMethod")
    List<Object[]> aggregateSplitPayments(@Param("startDate") LocalDateTime startDate,
                                          @Param("endDate") LocalDateTime endDate);

    @Query("SELECT sp.paymentMethod, COALESCE(SUM(sp.amount), 0) " +
           "FROM SalePayment sp " +
           "WHERE sp.sale.paymentMethod = com.picknpay.entity.PaymentMethod.SPLIT " +
           "  AND sp.sale.user.id = :userId " +
           "  AND sp.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY sp.paymentMethod")
    List<Object[]> aggregateSplitPaymentsByUser(@Param("userId") Long userId,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);

    // VAT breakdown: one row per distinct vat_rate. Returns ~3 rows in practice.
    @Query("SELECT new com.picknpay.dto.VatSummaryDTO(" +
           "  si.vatRate, " +
           "  COALESCE(SUM(si.totalPrice), 0), " +
           "  COALESCE(SUM(si.vatAmount), 0), " +
           "  COALESCE(SUM(si.priceExcludingVat), 0)) " +
           "FROM SaleItem si " +
           "WHERE si.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY si.vatRate " +
           "ORDER BY si.vatRate ASC")
    List<VatSummaryDTO> aggregateVatBreakdown(@Param("startDate") LocalDateTime startDate,
                                              @Param("endDate") LocalDateTime endDate);

    @Query("SELECT new com.picknpay.dto.VatSummaryDTO(" +
           "  si.vatRate, " +
           "  COALESCE(SUM(si.totalPrice), 0), " +
           "  COALESCE(SUM(si.vatAmount), 0), " +
           "  COALESCE(SUM(si.priceExcludingVat), 0)) " +
           "FROM SaleItem si " +
           "WHERE si.sale.user.id = :userId AND si.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY si.vatRate " +
           "ORDER BY si.vatRate ASC")
    List<VatSummaryDTO> aggregateVatBreakdownByUser(@Param("userId") Long userId,
                                                    @Param("startDate") LocalDateTime startDate,
                                                    @Param("endDate") LocalDateTime endDate);

    // Category breakdown: one row per category (NULL category = Quick Sale).
    // Returns ~30 rows for the whole inventory at most.
    @Query("SELECT new com.picknpay.dto.CategorySummaryDTO(" +
           "  c.name, " +
           "  COALESCE(SUM(si.totalPrice), 0), " +
           "  COALESCE(SUM(si.quantity), 0)) " +
           "FROM SaleItem si " +
           "LEFT JOIN si.item i " +
           "LEFT JOIN i.category c " +
           "WHERE si.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY c.name " +
           "ORDER BY SUM(si.totalPrice) DESC")
    List<CategorySummaryDTO> aggregateCategoryBreakdown(@Param("startDate") LocalDateTime startDate,
                                                       @Param("endDate") LocalDateTime endDate);

    @Query("SELECT new com.picknpay.dto.CategorySummaryDTO(" +
           "  c.name, " +
           "  COALESCE(SUM(si.totalPrice), 0), " +
           "  COALESCE(SUM(si.quantity), 0)) " +
           "FROM SaleItem si " +
           "LEFT JOIN si.item i " +
           "LEFT JOIN i.category c " +
           "WHERE si.sale.user.id = :userId AND si.sale.saleDate BETWEEN :startDate AND :endDate " +
           "GROUP BY c.name " +
           "ORDER BY SUM(si.totalPrice) DESC")
    List<CategorySummaryDTO> aggregateCategoryBreakdownByUser(@Param("userId") Long userId,
                                                              @Param("startDate") LocalDateTime startDate,
                                                              @Param("endDate") LocalDateTime endDate);

    // Get sales by user ID and date range
    @Query("SELECT s FROM Sale s WHERE s.user.id = :userId AND s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Get sales by user ID and date range with salePayments eagerly fetched (for daily reports)
    @Query("SELECT DISTINCT s FROM Sale s LEFT JOIN FETCH s.salePayments WHERE s.user.id = :userId AND s.saleDate BETWEEN :startDate AND :endDate ORDER BY s.saleDate DESC")
    List<Sale> findSalesByUserIdAndDateRangeWithPayments(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
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
    
    // Check if user has any sales
    @Query("SELECT COUNT(s) > 0 FROM Sale s WHERE s.user.id = :userId")
    boolean existsByUserId(@Param("userId") Long userId);
}
