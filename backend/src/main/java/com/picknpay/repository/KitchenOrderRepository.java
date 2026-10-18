package com.picknpay.repository;

import com.picknpay.entity.KitchenOrder;
import com.picknpay.entity.KitchenOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KitchenOrderRepository extends JpaRepository<KitchenOrder, Long> {

    List<KitchenOrder> findByStatusOrderByCreatedAtAsc(KitchenOrderStatus status);

    long countByStatus(KitchenOrderStatus status);
}
