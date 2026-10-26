package com.picknpay.repository;

import com.picknpay.entity.KitchenOrder;
import com.picknpay.entity.KitchenOrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KitchenOrderRepository extends JpaRepository<KitchenOrder, Long> {

    List<KitchenOrder> findByStatusOrderByCreatedAtAsc(KitchenOrderStatus status);

    List<KitchenOrder> findByStatusNotOrderByCreatedAtAscDisplayOrderNoAsc(KitchenOrderStatus status);

    long countByStatus(KitchenOrderStatus status);

    long countByStatusNot(KitchenOrderStatus status);

    boolean existsByDisplayOrderNoAndStatusNot(Integer displayOrderNo, KitchenOrderStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM KitchenOrder o WHERE o.id = :id")
    Optional<KitchenOrder> lockById(@Param("id") Long id);
}
