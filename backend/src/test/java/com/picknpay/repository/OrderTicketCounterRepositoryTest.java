package com.picknpay.repository;

import com.picknpay.entity.KitchenOrderStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderTicketCounterRepositoryTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private KitchenOrderRepository kitchenOrderRepository;

    @Mock
    private Query query;

    private OrderTicketCounterRepository repository;

    @BeforeEach
    void setUp() {
        repository = new OrderTicketCounterRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        ReflectionTestUtils.setField(repository, "kitchenOrderRepository", kitchenOrderRepository);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(eq(1), any())).thenReturn(query);
    }

    @Test
    void allocateNextReturnsNumberWhenItIsNotOnOrdersPage() {
        when(query.getSingleResult()).thenReturn(7);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(7, KitchenOrderStatus.PAID))
                .thenReturn(false);

        assertEquals(7, repository.allocateNext(LocalDate.of(2026, 10, 24)));
        verify(query, times(1)).getSingleResult();
    }

    @Test
    void allocateNextSkipsNumberStillOpenOnOrdersPage() {
        when(query.getSingleResult()).thenReturn(5, 6);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(5, KitchenOrderStatus.PAID))
                .thenReturn(true);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(6, KitchenOrderStatus.PAID))
                .thenReturn(false);

        assertEquals(6, repository.allocateNext(LocalDate.of(2026, 10, 24)));
        verify(query, times(2)).getSingleResult();
    }

    @Test
    void allocateNextSkipsWrappedNumberIfOrderOneIsStillOpen() {
        when(query.getSingleResult()).thenReturn(1, 2);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(1, KitchenOrderStatus.PAID))
                .thenReturn(true);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(2, KitchenOrderStatus.PAID))
                .thenReturn(false);

        assertEquals(2, repository.allocateNext(LocalDate.of(2026, 10, 24)));
    }

    @Test
    void allocateNextThrowsWhenEveryNumberIsStillOpen() {
        when(query.getSingleResult()).thenReturn(1);
        when(kitchenOrderRepository.existsByDisplayOrderNoAndStatusNot(1, KitchenOrderStatus.PAID))
                .thenReturn(true);

        RuntimeException error = assertThrows(RuntimeException.class,
                () -> repository.allocateNext(LocalDate.of(2026, 10, 24)));
        assertEquals("All order numbers 1-99 are still open. Pay or delete one before sending another.",
                error.getMessage());
        verify(query, times(99)).getSingleResult();
    }
}
