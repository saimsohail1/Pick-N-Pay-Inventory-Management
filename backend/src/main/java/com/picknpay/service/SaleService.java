package com.picknpay.service;

import com.picknpay.dto.SaleDTO;
import com.picknpay.dto.SaleItemDTO;
import com.picknpay.dto.DailyReportDTO;
import com.picknpay.entity.Item;
import com.picknpay.entity.Sale;
import com.picknpay.entity.SaleItem;
import com.picknpay.entity.PaymentMethod;
import com.picknpay.entity.User;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.SaleRepository;
import com.picknpay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SaleService {
    
    @Autowired
    private SaleRepository saleRepository;
    
    @Autowired
    private ItemRepository itemRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    public List<SaleDTO> getAllSales() {
        return saleRepository.findAllByOrderBySaleDateDesc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public Optional<SaleDTO> getSaleById(Long id) {
        return saleRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    public List<SaleDTO> getSalesByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return saleRepository.findSalesByDateRange(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    // New methods for role-based filtering
    public List<SaleDTO> getSalesByUserIdAndDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        return saleRepository.findSalesByUserIdAndDateRange(userId, startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<SaleDTO> getSalesByUserId(Long userId) {
        return saleRepository.findSalesByUserId(userId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<SaleDTO> getSalesByDateRangeForAdmin(LocalDateTime startDate, LocalDateTime endDate) {
        return saleRepository.findSalesByDateRangeForAdmin(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<SaleDTO> getTodaySales(Long userId, boolean isAdmin) {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(999999999);
        
        if (isAdmin) {
            return getSalesByDateRangeForAdmin(startOfDay, endOfDay);
        } else {
            return getSalesByUserIdAndDateRange(userId, startOfDay, endOfDay);
        }
    }
    
    public SaleDTO createSale(SaleDTO saleDTO) {
        Sale sale = new Sale();
        sale.setSaleDate(LocalDateTime.now());
        sale.setPaymentMethod(saleDTO.getPaymentMethod());
        
        // Set the user relationship
        if (saleDTO.getUserId() != null) {
            User user = userRepository.findById(saleDTO.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + saleDTO.getUserId()));
            sale.setUser(user);
        }
        // Note: User is optional to handle existing data without user associations
        
        BigDecimal totalAmount = BigDecimal.ZERO;
        
        for (SaleItemDTO saleItemDTO : saleDTO.getSaleItems()) {
            SaleItem saleItem = new SaleItem();
            saleItem.setSale(sale);
            saleItem.setQuantity(saleItemDTO.getQuantity());
            saleItem.setUnitPrice(saleItemDTO.getUnitPrice());
            saleItem.setTotalPrice(saleItemDTO.getTotalPrice());
            
            // Handle quick sales (itemId is null) vs regular item sales
            if (saleItemDTO.getItemId() != null) {
                Optional<Item> itemOpt = itemRepository.findById(saleItemDTO.getItemId());
                if (itemOpt.isPresent()) {
                    Item item = itemOpt.get();
                    
                    // Check stock availability
                    if (item.getStockQuantity() < saleItemDTO.getQuantity()) {
                        throw new RuntimeException("Insufficient stock for item: " + item.getName());
                    }
                    
                    saleItem.setItem(item);
                    
                    // Update stock
                    item.setStockQuantity(item.getStockQuantity() - saleItemDTO.getQuantity());
                    itemRepository.save(item);
                } else {
                    throw new RuntimeException("Item not found with ID: " + saleItemDTO.getItemId());
                }
            } else {
                // Quick sale - no specific item, just a cash transaction
                saleItem.setItem(null);
            }
            
            sale.getSaleItems().add(saleItem);
            totalAmount = totalAmount.add(saleItemDTO.getTotalPrice());
        }
        
        sale.setTotalAmount(totalAmount);
        Sale savedSale = saleRepository.save(sale);
        return convertToDTO(savedSale);
    }
    
    public Double getTotalSalesByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        Double total = saleRepository.getTotalSalesByDateRange(startDate, endDate);
        return total != null ? total : 0.0;
    }
    
    private SaleDTO convertToDTO(Sale sale) {
        SaleDTO dto = new SaleDTO();
        dto.setId(sale.getId());
        dto.setTotalAmount(sale.getTotalAmount());
        dto.setSaleDate(sale.getSaleDate());
        dto.setPaymentMethod(sale.getPaymentMethod());
        dto.setUserId(sale.getUser() != null ? sale.getUser().getId() : null);
        
        List<SaleItemDTO> saleItemDTOs = sale.getSaleItems().stream()
                .map(this::convertSaleItemToDTO)
                .collect(Collectors.toList());
        dto.setSaleItems(saleItemDTOs);
        
        return dto;
    }
    
    private SaleItemDTO convertSaleItemToDTO(SaleItem saleItem) {
        SaleItemDTO dto = new SaleItemDTO();
        dto.setId(saleItem.getId());
        dto.setQuantity(saleItem.getQuantity());
        dto.setUnitPrice(saleItem.getUnitPrice());
        dto.setTotalPrice(saleItem.getTotalPrice());
        
        // Handle null items (quick sales)
        if (saleItem.getItem() != null) {
            dto.setItemId(saleItem.getItem().getId());
            dto.setItemName(saleItem.getItem().getName());
            dto.setItemBarcode(saleItem.getItem().getBarcode());
        } else {
            dto.setItemId(null);
            dto.setItemName("Quick Sale");
            dto.setItemBarcode("N/A");
        }
        
        return dto;
    }

    public void deleteSale(Long saleId) {
        Optional<Sale> saleOpt = saleRepository.findById(saleId);
        if (saleOpt.isPresent()) {
            Sale sale = saleOpt.get();
            
            // Restore stock for items that were sold
            for (SaleItem saleItem : sale.getSaleItems()) {
                if (saleItem.getItem() != null) {
                    Item item = saleItem.getItem();
                    item.setStockQuantity(item.getStockQuantity() + saleItem.getQuantity());
                    itemRepository.save(item);
                }
            }
            
            // Delete the sale (this will cascade delete sale items due to @OneToMany cascade = CascadeType.ALL)
            saleRepository.delete(sale);
        } else {
            throw new RuntimeException("Sale not found with ID: " + saleId);
        }
    }

    public DailyReportDTO getDailyReport(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);

        // Get total sales count and amount
        Long totalSales = saleRepository.getSalesCountByDateRange(startOfDay, endOfDay);
        Double totalAmountDouble = saleRepository.getTotalSalesByDateRange(startOfDay, endOfDay);
        BigDecimal totalAmount = totalAmountDouble != null ? BigDecimal.valueOf(totalAmountDouble) : BigDecimal.ZERO;

        // Get cash sales count and amount
        Long cashSales = saleRepository.getSalesCountByDateRangeAndPaymentMethod(startOfDay, endOfDay, PaymentMethod.CASH);
        Double cashAmountDouble = saleRepository.getTotalSalesByDateRangeAndPaymentMethod(startOfDay, endOfDay, PaymentMethod.CASH);
        BigDecimal cashAmount = cashAmountDouble != null ? BigDecimal.valueOf(cashAmountDouble) : BigDecimal.ZERO;

        // Get card sales count and amount
        Long cardSales = saleRepository.getSalesCountByDateRangeAndPaymentMethod(startOfDay, endOfDay, PaymentMethod.CARD);
        Double cardAmountDouble = saleRepository.getTotalSalesByDateRangeAndPaymentMethod(startOfDay, endOfDay, PaymentMethod.CARD);
        BigDecimal cardAmount = cardAmountDouble != null ? BigDecimal.valueOf(cardAmountDouble) : BigDecimal.ZERO;

        return new DailyReportDTO(date, totalSales, totalAmount, cashSales, cashAmount, cardSales, cardAmount);
    }
    
    public DailyReportDTO getDailyReportByUser(LocalDate date, Long userId) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);

        // Get user-specific sales
        List<Sale> userSales = saleRepository.findSalesByUserIdAndDateRange(userId, startOfDay, endOfDay);
        
        // Calculate totals
        Long totalSales = (long) userSales.size();
        BigDecimal totalAmount = userSales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate cash sales
        Long cashSales = userSales.stream()
                .filter(sale -> sale.getPaymentMethod() == PaymentMethod.CASH)
                .count();
        BigDecimal cashAmount = userSales.stream()
                .filter(sale -> sale.getPaymentMethod() == PaymentMethod.CASH)
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate card sales
        Long cardSales = userSales.stream()
                .filter(sale -> sale.getPaymentMethod() == PaymentMethod.CARD)
                .count();
        BigDecimal cardAmount = userSales.stream()
                .filter(sale -> sale.getPaymentMethod() == PaymentMethod.CARD)
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DailyReportDTO(date, totalSales, totalAmount, cashSales, cashAmount, cardSales, cardAmount);
    }
    
    public SaleDTO updateSale(Long id, SaleDTO saleDTO) {
        Sale existingSale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sale not found with id: " + id));
        
        // Update basic sale information
        existingSale.setPaymentMethod(saleDTO.getPaymentMethod());
        
        // Update user relationship
        if (saleDTO.getUserId() != null) {
            User user = userRepository.findById(saleDTO.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + saleDTO.getUserId()));
            existingSale.setUser(user);
        }
        
        // Clear existing sale items
        existingSale.getSaleItems().clear();
        
        // Add new sale items
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (SaleItemDTO saleItemDTO : saleDTO.getSaleItems()) {
            SaleItem saleItem = new SaleItem();
            saleItem.setSale(existingSale);
            saleItem.setQuantity(saleItemDTO.getQuantity());
            saleItem.setUnitPrice(saleItemDTO.getUnitPrice());
            saleItem.setTotalPrice(saleItemDTO.getTotalPrice());
            
            if (saleItemDTO.getItemId() != null) {
                Optional<Item> itemOpt = itemRepository.findById(saleItemDTO.getItemId());
                if (itemOpt.isPresent()) {
                    Item item = itemOpt.get();
                    saleItem.setItem(item);
                }
            }
            
            existingSale.getSaleItems().add(saleItem);
            totalAmount = totalAmount.add(saleItemDTO.getTotalPrice());
        }
        
        existingSale.setTotalAmount(totalAmount);
        
        Sale updatedSale = saleRepository.save(existingSale);
        return convertToDTO(updatedSale);
    }
}
