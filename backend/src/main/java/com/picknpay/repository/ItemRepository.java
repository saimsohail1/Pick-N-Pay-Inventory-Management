package com.picknpay.repository;

import com.picknpay.entity.Item;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>, PagingAndSortingRepository<Item, Long> {
    
    Optional<Item> findByBarcode(String barcode);
    
    List<Item> findByNameContainingIgnoreCase(String name);
    
    List<Item> findByCategoryId(Long categoryId);
    
    @Query("SELECT i FROM Item i WHERE i.stockQuantity > 0")
    List<Item> findAvailableItems();
    
    @Query("SELECT i FROM Item i WHERE i.stockQuantity <= :threshold")
    List<Item> findLowStockItems(@Param("threshold") Integer threshold);
}
