package com.picknpay.service;

import com.picknpay.dto.KitchenOrderDTO;
import com.picknpay.dto.KitchenOrderItemDTO;
import com.picknpay.dto.KitchenOrderPayDTO;
import com.picknpay.dto.SaleDTO;
import com.picknpay.entity.KitchenOrder;
import com.picknpay.entity.KitchenOrderStatus;
import com.picknpay.entity.PaymentMethod;
import com.picknpay.repository.KitchenOrderRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class KitchenOrderFlowIntegrationTest {

    @Autowired
    private KitchenOrderService kitchenOrderService;

    @Autowired
    private KitchenOrderRepository kitchenOrderRepository;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void clearTicketCounter() {
        entityManager.createNativeQuery("DELETE FROM order_ticket_counters").executeUpdate();
    }

    @Test
    void sendOrdersGetUniqueSequentialNumbers() {
        KitchenOrderDTO first = kitchenOrderService.create(order("Chapli Kebab"));
        KitchenOrderDTO second = kitchenOrderService.create(order("Chicken Burger"));

        assertEquals(1, first.getDisplayOrderNo());
        assertEquals(2, second.getDisplayOrderNo());
        assertEquals(List.of(1, 2), kitchenOrderService.listOpen().stream()
                .map(KitchenOrderDTO::getDisplayOrderNo)
                .toList());
    }

    @Test
    void leftoverOpenOrderNumberIsNotReused() {
        KitchenOrder leftover = leftoverOpenOrder(7);
        kitchenOrderRepository.saveAndFlush(leftover);
        setCounter(6);

        KitchenOrderDTO next = kitchenOrderService.create(order("Falafel Wrap"));

        assertEquals(8, next.getDisplayOrderNo());
        assertTrue(kitchenOrderService.listOpen().stream()
                .anyMatch(order -> order.getDisplayOrderNo() == 7));
        assertTrue(kitchenOrderService.listOpen().stream()
                .anyMatch(order -> order.getId().equals(next.getId()) && order.getDisplayOrderNo() == 8));
    }

    @Test
    void wrappingSkipsNumberStillOnOrdersPage() {
        KitchenOrder leftover = leftoverOpenOrder(1);
        kitchenOrderRepository.saveAndFlush(leftover);
        setCounter(99);

        KitchenOrderDTO next = kitchenOrderService.create(order("Naan Bread"));

        assertEquals(2, next.getDisplayOrderNo());
    }

    @Test
    void deletedOrderNumberCanBeReusedAfterWrap() {
        KitchenOrderDTO leftover = kitchenOrderService.create(order("Coke"));
        assertEquals(1, leftover.getDisplayOrderNo());
        kitchenOrderService.deleteUnpaid(leftover.getId());
        setCounter(99);

        KitchenOrderDTO next = kitchenOrderService.create(order("Water"));

        assertEquals(1, next.getDisplayOrderNo());
        assertFalse(kitchenOrderRepository.existsById(leftover.getId()));
    }

    @Test
    void editKeepsNumberAndAddsItemsWithoutMovingSequence() {
        KitchenOrderDTO first = kitchenOrderService.create(order("Chapli Kebab"));
        KitchenOrderDTO second = kitchenOrderService.create(order("Chicken Burger"));

        KitchenOrderItemDTO extra = new KitchenOrderItemDTO();
        extra.setQuantity(1);
        extra.setUnitPrice(new BigDecimal("1.50"));
        extra.setTotalPrice(new BigDecimal("1.50"));
        extra.setItemName("Coke");
        extra.setVatRate(new BigDecimal("23.00"));

        KitchenOrderDTO update = new KitchenOrderDTO();
        update.setItems(List.of(
                first.getItems().get(0),
                extra
        ));
        KitchenOrderDTO edited = kitchenOrderService.updateUnpaid(first.getId(), update);

        assertEquals(first.getDisplayOrderNo(), edited.getDisplayOrderNo());
        assertEquals(2, edited.getItems().size());
        assertEquals(new BigDecimal("6.49"), edited.getTotalAmount());
        assertEquals(
                List.of(first.getDisplayOrderNo(), second.getDisplayOrderNo()),
                kitchenOrderService.listOpen().stream().map(KitchenOrderDTO::getDisplayOrderNo).toList()
        );
    }

    @Test
    void payRemovesOrderFromOpenListAndKeepsNumberOnSale() {
        KitchenOrderDTO open = kitchenOrderService.create(order("Lamb Shish Kebab"));
        KitchenOrderPayDTO pay = new KitchenOrderPayDTO();
        pay.setPaymentMethod(PaymentMethod.CASH);

        SaleDTO sale = kitchenOrderService.pay(open.getId(), pay);

        assertEquals(open.getDisplayOrderNo(), sale.getDisplayOrderNo());
        assertTrue(kitchenOrderService.listOpen().isEmpty());
        assertEquals(KitchenOrderStatus.PAID, kitchenOrderRepository.findById(open.getId()).orElseThrow().getStatus());
    }

    @Test
    void paidOrderCannotBeDeletedAndPaidAgain() {
        KitchenOrderDTO open = kitchenOrderService.create(order("Garlic Chips"));
        KitchenOrderPayDTO pay = new KitchenOrderPayDTO();
        pay.setPaymentMethod(PaymentMethod.CARD);
        kitchenOrderService.pay(open.getId(), pay);

        assertThrows(RuntimeException.class, () -> kitchenOrderService.deleteUnpaid(open.getId()));
        assertThrows(RuntimeException.class, () -> kitchenOrderService.pay(open.getId(), pay));
    }

    @Test
    void openListStaysInSendOrderAfterLaterOrdersArePaid() {
        KitchenOrderDTO first = kitchenOrderService.create(order("Mains one"));
        KitchenOrderDTO second = kitchenOrderService.create(order("Mains two"));
        KitchenOrderDTO third = kitchenOrderService.create(order("Mains three"));

        KitchenOrderPayDTO pay = new KitchenOrderPayDTO();
        pay.setPaymentMethod(PaymentMethod.CASH);
        kitchenOrderService.pay(second.getId(), pay);

        assertEquals(
                List.of(first.getDisplayOrderNo(), third.getDisplayOrderNo()),
                kitchenOrderService.listOpen().stream().map(KitchenOrderDTO::getDisplayOrderNo).toList()
        );
    }

    private KitchenOrderDTO order(String name) {
        KitchenOrderItemDTO line = new KitchenOrderItemDTO();
        line.setQuantity(1);
        line.setUnitPrice(new BigDecimal("4.99"));
        line.setTotalPrice(new BigDecimal("4.99"));
        line.setItemName(name);
        line.setVatRate(new BigDecimal("9.00"));

        KitchenOrderDTO dto = new KitchenOrderDTO();
        dto.setItems(List.of(line));
        return dto;
    }

    private KitchenOrder leftoverOpenOrder(int displayNo) {
        KitchenOrder order = new KitchenOrder();
        order.setDisplayOrderNo(displayNo);
        order.setStatus(KitchenOrderStatus.PREPARING);
        order.setTotalAmount(new BigDecimal("9.99"));
        order.setCreatedAt(LocalDateTime.now().minusHours(2));
        return order;
    }

    private void setCounter(int lastNo) {
        entityManager.createNativeQuery(
                "INSERT INTO order_ticket_counters (business_date, last_no) VALUES (?1, ?2) "
                        + "ON CONFLICT (business_date) DO UPDATE SET last_no = ?2"
        ).setParameter(1, Date.valueOf(LocalDate.now()))
                .setParameter(2, lastNo)
                .executeUpdate();
        entityManager.flush();
    }
}
