package com.picknpay.repository;

import com.picknpay.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long> {
    
    List<Batch> findByProductId(Long productId);
    
    Optional<Batch> findByProductIdAndBatchId(Long productId, String batchId);
    
    List<Batch> findByExpiryDateLessThanEqualAndExpiryDateIsNotNull(LocalDate expiryDate);
    
    List<Batch> findByExpiryDateLessThanAndExpiryDateIsNotNull(LocalDate expiryDate);
    
    @Query("SELECT b FROM Batch b WHERE b.quantity > 0")
    List<Batch> findAvailableBatches();
    
    @Query("SELECT b FROM Batch b WHERE b.quantity <= :threshold")
    List<Batch> findLowStockBatches(@Param("threshold") Integer threshold);
    
    @Query("SELECT b FROM Batch b WHERE b.product.id = :productId AND b.quantity > 0 ORDER BY b.expiryDate ASC")
    List<Batch> findAvailableBatchesByProductOrderByExpiry(@Param("productId") Long productId);
}
