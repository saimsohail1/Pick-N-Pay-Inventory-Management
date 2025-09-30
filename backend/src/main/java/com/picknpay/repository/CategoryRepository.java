package com.picknpay.repository;

import com.picknpay.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    
    List<Category> findByIsActiveTrueOrderByNameAsc();
    
    Optional<Category> findByNameAndIsActiveTrue(String name);
    
}