package com.picknpay.service;

import com.picknpay.dto.KitchenOrderDTO;
import com.picknpay.dto.KitchenOrderItemDTO;
import com.picknpay.dto.KitchenOrderPayDTO;
import com.picknpay.dto.SaleDTO;
import com.picknpay.dto.SaleItemDTO;
import com.picknpay.entity.Item;
import com.picknpay.entity.KitchenOrder;
import com.picknpay.entity.KitchenOrderItem;
import com.picknpay.entity.KitchenOrderStatus;
import com.picknpay.entity.User;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.KitchenOrderRepository;
import com.picknpay.repository.OrderTicketCounterRepository;
import com.picknpay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class KitchenOrderService {

    @Autowired
    private KitchenOrderRepository kitchenOrderRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderTicketCounterRepository orderTicketCounterRepository;

    @Autowired
    private SaleService saleService;

    public KitchenOrderDTO create(KitchenOrderDTO dto) {
        KitchenOrder order = new KitchenOrder();
        order.setCreatedAt(LocalDateTime.now());
        order.setStatus(KitchenOrderStatus.PREPARING);
        order.setDisplayOrderNo(orderTicketCounterRepository.allocateNext(LocalDate.now()));

        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getUserId()));
            order.setUser(user);
        }

        applyItems(order, dto);
        return toDto(kitchenOrderRepository.save(order));
    }

    public KitchenOrderDTO updateUnpaid(Long id, KitchenOrderDTO dto) {
        KitchenOrder order = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kitchen order not found: " + id));
        if (order.getStatus() == KitchenOrderStatus.PAID) {
            throw new RuntimeException("Paid orders cannot be edited");
        }
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new RuntimeException("Add items before updating the order");
        }
        order.getItems().clear();
        applyItems(order, dto);
        return toDto(kitchenOrderRepository.save(order));
    }

    public List<KitchenOrderDTO> listByStatus(KitchenOrderStatus status) {
        return kitchenOrderRepository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<KitchenOrderDTO> listOpen() {
        return kitchenOrderRepository.findByStatusNotOrderByCreatedAtAscDisplayOrderNoAsc(KitchenOrderStatus.PAID)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public long countByStatus(KitchenOrderStatus status) {
        return kitchenOrderRepository.countByStatus(status);
    }

    public long countOpen() {
        return kitchenOrderRepository.countByStatusNot(KitchenOrderStatus.PAID);
    }

    public KitchenOrderDTO markPrepared(Long id) {
        KitchenOrder order = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kitchen order not found: " + id));
        if (order.getStatus() != KitchenOrderStatus.PREPARING) {
            throw new RuntimeException("Only preparing orders can be marked prepared");
        }
        order.setStatus(KitchenOrderStatus.READY);
        order.setPreparedAt(LocalDateTime.now());
        return toDto(kitchenOrderRepository.save(order));
    }

    public SaleDTO pay(Long id, KitchenOrderPayDTO payDto) {
        KitchenOrder order = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kitchen order not found: " + id));
        if (order.getStatus() == KitchenOrderStatus.PAID) {
            throw new RuntimeException("This order is already paid");
        }

        SaleDTO saleDto = new SaleDTO();
        saleDto.setPaymentMethod(payDto.getPaymentMethod());
        saleDto.setPaymentSplits(payDto.getPaymentSplits());
        saleDto.setUserId(payDto.getUserId() != null ? payDto.getUserId()
                : (order.getUser() != null ? order.getUser().getId() : null));
        saleDto.setDisplayOrderNo(order.getDisplayOrderNo());
        saleDto.setTotalAmount(order.getTotalAmount());
        saleDto.setSaleItems(order.getItems().stream().map(this::toSaleItemDto).collect(Collectors.toList()));

        SaleDTO saved = saleService.createSale(saleDto);
        order.setStatus(KitchenOrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setSaleId(saved.getId());
        kitchenOrderRepository.save(order);
        return saved;
    }

    public void deleteUnpaid(Long id) {
        KitchenOrder order = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kitchen order not found: " + id));
        if (order.getStatus() == KitchenOrderStatus.PAID) {
            throw new RuntimeException("Paid orders cannot be deleted");
        }
        kitchenOrderRepository.delete(order);
    }

    private void applyItems(KitchenOrder order, KitchenOrderDTO dto) {
        BigDecimal total = BigDecimal.ZERO;
        for (KitchenOrderItemDTO itemDto : dto.getItems()) {
            KitchenOrderItem line = new KitchenOrderItem();
            line.setKitchenOrder(order);
            line.setQuantity(itemDto.getQuantity());
            line.setUnitPrice(itemDto.getUnitPrice());
            line.setTotalPrice(itemDto.getTotalPrice());
            line.setItemName(itemDto.getItemName() != null ? itemDto.getItemName() : "Item");
            line.setItemBarcode(itemDto.getItemBarcode());
            line.setVatRate(itemDto.getVatRate());

            if (itemDto.getItemId() != null) {
                itemRepository.findById(itemDto.getItemId()).ifPresent(item -> {
                    line.setItem(item);
                    if (itemDto.getItemName() == null) {
                        line.setItemName(item.getName());
                    }
                    if (itemDto.getItemBarcode() == null) {
                        line.setItemBarcode(item.getBarcode());
                    }
                    if (itemDto.getVatRate() == null) {
                        line.setVatRate(item.getVatRate());
                    }
                });
            }

            order.getItems().add(line);
            total = total.add(itemDto.getTotalPrice());
        }
        order.setTotalAmount(total);
    }

    private SaleItemDTO toSaleItemDto(KitchenOrderItem line) {
        SaleItemDTO dto = new SaleItemDTO();
        dto.setItemId(line.getItem() != null ? line.getItem().getId() : null);
        dto.setQuantity(line.getQuantity());
        dto.setUnitPrice(line.getUnitPrice());
        dto.setTotalPrice(line.getTotalPrice());
        dto.setItemName(line.getItemName());
        dto.setItemBarcode(line.getItemBarcode());
        dto.setVatRate(line.getVatRate());
        return dto;
    }

    private KitchenOrderDTO toDto(KitchenOrder order) {
        KitchenOrderDTO dto = new KitchenOrderDTO();
        dto.setId(order.getId());
        dto.setDisplayOrderNo(order.getDisplayOrderNo());
        dto.setStatus(order.getStatus());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setUserId(order.getUser() != null ? order.getUser().getId() : null);
        dto.setCreatedAt(order.getCreatedAt());
        dto.setPreparedAt(order.getPreparedAt());
        dto.setSaleId(order.getSaleId());
        dto.setItems(order.getItems().stream().map(this::toItemDto).collect(Collectors.toList()));
        return dto;
    }

    private KitchenOrderItemDTO toItemDto(KitchenOrderItem line) {
        KitchenOrderItemDTO dto = new KitchenOrderItemDTO();
        dto.setId(line.getId());
        dto.setItemId(line.getItem() != null ? line.getItem().getId() : null);
        dto.setQuantity(line.getQuantity());
        dto.setUnitPrice(line.getUnitPrice());
        dto.setTotalPrice(line.getTotalPrice());
        dto.setItemName(line.getItemName());
        dto.setItemBarcode(line.getItemBarcode());
        dto.setVatRate(line.getVatRate());
        return dto;
    }
}
