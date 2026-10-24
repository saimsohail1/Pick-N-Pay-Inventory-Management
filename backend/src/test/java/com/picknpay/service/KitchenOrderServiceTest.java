package com.picknpay.service;

import com.picknpay.dto.KitchenOrderDTO;
import com.picknpay.dto.KitchenOrderItemDTO;
import com.picknpay.dto.KitchenOrderPayDTO;
import com.picknpay.dto.SaleDTO;
import com.picknpay.entity.KitchenOrder;
import com.picknpay.entity.KitchenOrderStatus;
import com.picknpay.entity.PaymentMethod;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.KitchenOrderRepository;
import com.picknpay.repository.OrderTicketCounterRepository;
import com.picknpay.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KitchenOrderServiceTest {

    @Mock
    private KitchenOrderRepository kitchenOrderRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderTicketCounterRepository orderTicketCounterRepository;

    @Mock
    private SaleService saleService;

    @InjectMocks
    private KitchenOrderService kitchenOrderService;

    @BeforeEach
    void stubSave() {
        lenient().when(kitchenOrderRepository.save(any(KitchenOrder.class))).thenAnswer(invocation -> {
            KitchenOrder order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(11L);
            }
            return order;
        });
    }

    @Test
    void createAssignsDisplayNumberFromCounter() {
        when(orderTicketCounterRepository.allocateNext(LocalDate.now())).thenReturn(14);

        KitchenOrderDTO created = kitchenOrderService.create(newOrder("Chicken Burger", "4.99"));

        assertEquals(14, created.getDisplayOrderNo());
        assertEquals(KitchenOrderStatus.PREPARING, created.getStatus());
        assertEquals(new BigDecimal("4.99"), created.getTotalAmount());
        verify(orderTicketCounterRepository).allocateNext(LocalDate.now());
    }

    @Test
    void payRejectsAlreadyPaidOrder() {
        KitchenOrder paid = openOrder(8, KitchenOrderStatus.PAID);
        when(kitchenOrderRepository.findById(8L)).thenReturn(Optional.of(paid));

        KitchenOrderPayDTO pay = new KitchenOrderPayDTO();
        pay.setPaymentMethod(PaymentMethod.CASH);

        RuntimeException error = assertThrows(RuntimeException.class, () -> kitchenOrderService.pay(8L, pay));
        assertEquals("This order is already paid", error.getMessage());
        verify(saleService, never()).createSale(any());
    }

    @Test
    void payConvertsUnpaidOrderToSale() {
        KitchenOrder open = openOrder(3, KitchenOrderStatus.PREPARING);
        when(kitchenOrderRepository.findById(3L)).thenReturn(Optional.of(open));
        SaleDTO sale = new SaleDTO();
        sale.setId(99L);
        sale.setDisplayOrderNo(3);
        when(saleService.createSale(any(SaleDTO.class))).thenReturn(sale);

        KitchenOrderPayDTO pay = new KitchenOrderPayDTO();
        pay.setPaymentMethod(PaymentMethod.CARD);

        SaleDTO result = kitchenOrderService.pay(3L, pay);

        assertEquals(99L, result.getId());
        assertEquals(KitchenOrderStatus.PAID, open.getStatus());
        assertEquals(99L, open.getSaleId());
        ArgumentCaptor<SaleDTO> captor = ArgumentCaptor.forClass(SaleDTO.class);
        verify(saleService).createSale(captor.capture());
        assertEquals(3, captor.getValue().getDisplayOrderNo());
        assertEquals(PaymentMethod.CARD, captor.getValue().getPaymentMethod());
    }

    @Test
    void deleteRemovesUnpaidOrder() {
        KitchenOrder open = openOrder(4, KitchenOrderStatus.PREPARING);
        when(kitchenOrderRepository.findById(4L)).thenReturn(Optional.of(open));

        kitchenOrderService.deleteUnpaid(4L);

        verify(kitchenOrderRepository).delete(open);
    }

    @Test
    void deleteRejectsPaidOrder() {
        KitchenOrder paid = openOrder(4, KitchenOrderStatus.PAID);
        when(kitchenOrderRepository.findById(4L)).thenReturn(Optional.of(paid));

        RuntimeException error = assertThrows(RuntimeException.class, () -> kitchenOrderService.deleteUnpaid(4L));
        assertEquals("Paid orders cannot be deleted", error.getMessage());
        verify(kitchenOrderRepository, never()).delete(any());
    }

    @Test
    void updateReplacesItemsAndKeepsOrderNumber() {
        KitchenOrder open = openOrder(5, KitchenOrderStatus.PREPARING);
        when(kitchenOrderRepository.findById(5L)).thenReturn(Optional.of(open));

        KitchenOrderDTO updated = kitchenOrderService.updateUnpaid(5L, newOrder("Coke", "1.50"));

        assertEquals(5, updated.getDisplayOrderNo());
        assertEquals(new BigDecimal("1.50"), updated.getTotalAmount());
        assertEquals(1, updated.getItems().size());
        assertEquals("Coke", updated.getItems().get(0).getItemName());
        verify(orderTicketCounterRepository, never()).allocateNext(any());
    }

    @Test
    void updateKeepsLineWhenCatalogueItemWasRemoved() {
        KitchenOrder open = openOrder(5, KitchenOrderStatus.PREPARING);
        when(kitchenOrderRepository.findById(5L)).thenReturn(Optional.of(open));
        when(itemRepository.findById(999L)).thenReturn(Optional.empty());

        KitchenOrderDTO dto = newOrder("Deleted pizza", "9.99");
        dto.getItems().get(0).setItemId(999L);

        KitchenOrderDTO updated = kitchenOrderService.updateUnpaid(5L, dto);

        assertEquals("Deleted pizza", updated.getItems().get(0).getItemName());
        assertEquals(new BigDecimal("9.99"), updated.getTotalAmount());
    }

    @Test
    void updateRejectsPaidOrder() {
        KitchenOrder paid = openOrder(5, KitchenOrderStatus.PAID);
        when(kitchenOrderRepository.findById(5L)).thenReturn(Optional.of(paid));

        RuntimeException error = assertThrows(RuntimeException.class,
                () -> kitchenOrderService.updateUnpaid(5L, newOrder("Coke", "1.50")));
        assertEquals("Paid orders cannot be edited", error.getMessage());
    }

    @Test
    void listOpenKeepsSendOrder() {
        KitchenOrder first = openOrder(1, KitchenOrderStatus.PREPARING);
        first.setCreatedAt(LocalDateTime.of(2026, 10, 24, 12, 0));
        KitchenOrder second = openOrder(2, KitchenOrderStatus.READY);
        second.setCreatedAt(LocalDateTime.of(2026, 10, 24, 12, 5));
        when(kitchenOrderRepository.findByStatusNotOrderByCreatedAtAscDisplayOrderNoAsc(KitchenOrderStatus.PAID))
                .thenReturn(List.of(first, second));

        List<KitchenOrderDTO> open = kitchenOrderService.listOpen();

        assertEquals(List.of(1, 2), open.stream().map(KitchenOrderDTO::getDisplayOrderNo).toList());
    }

    private KitchenOrderDTO newOrder(String name, String price) {
        KitchenOrderItemDTO line = new KitchenOrderItemDTO();
        line.setQuantity(1);
        line.setUnitPrice(new BigDecimal(price));
        line.setTotalPrice(new BigDecimal(price));
        line.setItemName(name);
        line.setVatRate(new BigDecimal("9.00"));

        KitchenOrderDTO dto = new KitchenOrderDTO();
        dto.setItems(List.of(line));
        return dto;
    }

    private KitchenOrder openOrder(int displayNo, KitchenOrderStatus status) {
        KitchenOrder order = new KitchenOrder();
        order.setId((long) displayNo);
        order.setDisplayOrderNo(displayNo);
        order.setStatus(status);
        order.setTotalAmount(new BigDecimal("4.99"));
        order.setCreatedAt(LocalDateTime.now());
        return order;
    }
}
