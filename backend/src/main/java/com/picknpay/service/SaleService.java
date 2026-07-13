package com.picknpay.service;

import com.picknpay.dto.SaleDTO;
import com.picknpay.dto.SaleItemDTO;
import com.picknpay.dto.SalePaymentDTO;
import com.picknpay.dto.DailyReportDTO;
import com.picknpay.dto.CategorySummaryDTO;
import com.picknpay.dto.VatSummaryDTO;
import com.picknpay.entity.Item;
import com.picknpay.entity.Sale;
import com.picknpay.entity.SaleItem;
import com.picknpay.entity.SalePayment;
import com.picknpay.entity.PaymentMethod;
import com.picknpay.entity.User;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.SaleRepository;
import com.picknpay.repository.SaleItemRepository;
import com.picknpay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
@Transactional
public class SaleService {
    
    @Autowired
    private SaleRepository saleRepository;
    
    @Autowired
    private ItemRepository itemRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SaleItemRepository saleItemRepository;

    @Value("${app.b2b-mode:false}")
    private boolean b2bMode;
    
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
                    
                    // Check stock availability - prevent sale if quantity exceeds available stock
                    // Items can be added to cart and edited, but sale cannot complete if insufficient stock
                    if (item.getStockQuantity() < saleItemDTO.getQuantity()) {
                        throw new RuntimeException("Insufficient stock for item: " + item.getName() + 
                            ". Available: " + item.getStockQuantity() + ", Requested: " + saleItemDTO.getQuantity());
                    }
                    
                    saleItem.setItem(item);
                    saleItem.setItemName(item.getName());
                    saleItem.setItemBarcode(item.getBarcode());
                    saleItem.setBatchId(saleItemDTO.getBatchId()); // Set batch ID from DTO
                    
                    // Calculate VAT
                    BigDecimal vatRate = item.getVatRate() != null ? item.getVatRate() : new BigDecimal("23.00");
                    BigDecimal totalPriceIncludingVat = saleItemDTO.getTotalPrice();
                    BigDecimal totalPriceExcludingVat = totalPriceIncludingVat.divide(BigDecimal.ONE.add(vatRate.divide(new BigDecimal("100"))), 2, BigDecimal.ROUND_HALF_UP);
                    BigDecimal totalVatAmount = totalPriceIncludingVat.subtract(totalPriceExcludingVat);
                    
                    saleItem.setVatRate(vatRate);
                    saleItem.setVatAmount(totalVatAmount);
                    saleItem.setPriceExcludingVat(totalPriceExcludingVat);
                    
                    // Update stock
                    item.setStockQuantity(item.getStockQuantity() - saleItemDTO.getQuantity());
                    itemRepository.save(item);
                } else {
                    throw new RuntimeException("Item not found with ID: " + saleItemDTO.getItemId());
                }
            } else {
                // Quick sale - no specific item, just a cash transaction
                saleItem.setItem(null);
                saleItem.setItemName(saleItemDTO.getItemName() != null ? saleItemDTO.getItemName() : "Quick Sale");
                saleItem.setItemBarcode(saleItemDTO.getItemBarcode() != null ? saleItemDTO.getItemBarcode() : "N/A");
                saleItem.setBatchId(null); // Quick sales don't have batch IDs
                
                // For quick sales, assume standard VAT rate
                BigDecimal vatRate = new BigDecimal("23.00");
                BigDecimal totalPriceIncludingVat = saleItemDTO.getTotalPrice();
                BigDecimal totalPriceExcludingVat = totalPriceIncludingVat.divide(BigDecimal.ONE.add(vatRate.divide(new BigDecimal("100"))), 2, BigDecimal.ROUND_HALF_UP);
                BigDecimal totalVatAmount = totalPriceIncludingVat.subtract(totalPriceExcludingVat);
                
                saleItem.setVatRate(vatRate);
                saleItem.setVatAmount(totalVatAmount);
                saleItem.setPriceExcludingVat(totalPriceExcludingVat);
            }
            
            sale.getSaleItems().add(saleItem);
            totalAmount = totalAmount.add(saleItemDTO.getTotalPrice());
        }
        
        sale.setTotalAmount(totalAmount);
        
        // Handle split payments if payment method is SPLIT
        if (saleDTO.getPaymentMethod() == PaymentMethod.SPLIT && saleDTO.getPaymentSplits() != null && !saleDTO.getPaymentSplits().isEmpty()) {
            BigDecimal splitTotal = BigDecimal.ZERO;
            for (SalePaymentDTO paymentSplitDTO : saleDTO.getPaymentSplits()) {
                SalePayment salePayment = new SalePayment();
                salePayment.setSale(sale);
                salePayment.setPaymentMethod(paymentSplitDTO.getPaymentMethod());
                salePayment.setAmount(paymentSplitDTO.getAmount());
                sale.getSalePayments().add(salePayment);
                splitTotal = splitTotal.add(paymentSplitDTO.getAmount());
            }
            // Validate that split payments sum equals total amount
            if (splitTotal.compareTo(totalAmount) != 0) {
                throw new RuntimeException("Split payment amounts (" + splitTotal + ") must equal total amount (" + totalAmount + ")");
            }
        }
        
        // Set notes if provided
        if (saleDTO.getNotes() != null) {
            sale.setNotes(saleDTO.getNotes());
        }
        
        // Set selected VAT rate if provided
        if (saleDTO.getSelectedVatRate() != null) {
            sale.setSelectedVatRate(saleDTO.getSelectedVatRate());
        }
        
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
        dto.setNotes(sale.getNotes());
        dto.setSelectedVatRate(sale.getSelectedVatRate());
        
        List<SaleItemDTO> saleItemDTOs = sale.getSaleItems().stream()
                .map(this::convertSaleItemToDTO)
                .collect(Collectors.toList());
        dto.setSaleItems(saleItemDTOs);
        
        // Convert payment splits if they exist
        if (sale.getSalePayments() != null && !sale.getSalePayments().isEmpty()) {
            List<SalePaymentDTO> paymentSplitDTOs = sale.getSalePayments().stream()
                    .map(this::convertSalePaymentToDTO)
                    .collect(Collectors.toList());
            dto.setPaymentSplits(paymentSplitDTOs);
        }
        
        return dto;
    }
    
    private SaleItemDTO convertSaleItemToDTO(SaleItem saleItem) {
        SaleItemDTO dto = new SaleItemDTO();
        dto.setId(saleItem.getId());
        dto.setQuantity(saleItem.getQuantity());
        dto.setUnitPrice(saleItem.getUnitPrice());
        dto.setTotalPrice(saleItem.getTotalPrice());
        dto.setBatchId(saleItem.getBatchId());
        
        // Set VAT fields
        dto.setVatRate(saleItem.getVatRate());
        dto.setVatAmount(saleItem.getVatAmount());
        dto.setPriceExcludingVat(saleItem.getPriceExcludingVat());
        
        // Handle null items (quick sales)
        if (saleItem.getItem() != null) {
            dto.setItemId(saleItem.getItem().getId());
            dto.setItemName(saleItem.getItemName()); // Use stored item name
            dto.setItemBarcode(saleItem.getItemBarcode()); // Use stored barcode
        } else {
            dto.setItemId(null);
            dto.setItemName(saleItem.getItemName()); // Use stored item name
            dto.setItemBarcode(saleItem.getItemBarcode()); // Use stored barcode
        }
        
        return dto;
    }
    
    private SalePaymentDTO convertSalePaymentToDTO(SalePayment salePayment) {
        SalePaymentDTO dto = new SalePaymentDTO();
        dto.setId(salePayment.getId());
        dto.setPaymentMethod(salePayment.getPaymentMethod());
        dto.setAmount(salePayment.getAmount());
        return dto;
    }

    public void deleteSale(Long saleId) {
        Optional<Sale> saleOpt = saleRepository.findById(saleId);
        if (saleOpt.isPresent()) {
            Sale sale = saleOpt.get();
            
            // Simply delete the sale - no inventory restoration
            // Once items are sold, they're gone from inventory
            saleRepository.delete(sale);
        } else {
            throw new RuntimeException("Sale not found with ID: " + saleId);
        }
    }

    @Transactional(readOnly = true)
    public DailyReportDTO getDailyReport(LocalDate date) {
        return buildReport(date, date, null);
    }
    
    @Transactional(readOnly = true)
    public DailyReportDTO getDailyReportByUser(LocalDate date, Long userId) {
        return buildReport(date, date, userId);
    }
    
    @Transactional(readOnly = true)
    public DailyReportDTO getDailyReportByUserAndDateRange(LocalDate startDate, LocalDate endDate, Long userId) {
        return buildReport(startDate, endDate, userId);
    }
    
    @Transactional(readOnly = true)
    public DailyReportDTO getDailyReportByDateRangeForAdmin(LocalDate startDate, LocalDate endDate) {
        return buildReport(startDate, endDate, null);
    }

    /**
     * Build a Z-Report using SQL aggregation queries (not entity loading).
     *
     * Previously this method loaded every sale + sale_item + item entity
     * for the entire range into memory and aggregated in Java, which on
     * wide ranges could exceed the JVM heap (OOM).
     *
     * This implementation pushes all aggregation down to PostgreSQL and
     * reads back at most a few dozen rows total.
     *
     * userId == null  ⇒ admin / all users
     * userId != null  ⇒ scoped to that user
     */
    private DailyReportDTO buildReport(LocalDate startDate, LocalDate endDate, Long userId) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end   = endDate.atTime(23, 59, 59);

        // 1) Payment-method summary: ~3 rows (CASH / CARD / SPLIT).
        List<Object[]> paymentRows = (userId == null)
                ? saleRepository.aggregatePaymentMethods(start, end)
                : saleRepository.aggregatePaymentMethodsByUser(userId, start, end);

        long totalSales = 0L;
        long cashSales  = 0L;
        long cardSales  = 0L;
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal cashAmount  = BigDecimal.ZERO;
        BigDecimal cardAmount  = BigDecimal.ZERO;

        for (Object[] row : paymentRows) {
            PaymentMethod pm = toPaymentMethod(row[0]);
            long count       = ((Number) row[1]).longValue();
            BigDecimal sum   = toBigDecimal(row[2]);

            totalSales  += count;
            totalAmount  = totalAmount.add(sum);

            if (pm == PaymentMethod.CASH) {
                cashSales  = count;
                cashAmount = cashAmount.add(sum);
            } else if (pm == PaymentMethod.CARD) {
                cardSales  = count;
                cardAmount = cardAmount.add(sum);
            }
            // SPLIT counts are intentionally not folded into cash/cardSales —
            // those track the number of pure-cash and pure-card transactions.
        }

        // 2) Split-payment breakdown: fold cash/card portions of SPLIT sales
        //    into the cash/card amounts (counts unchanged).
        List<Object[]> splitRows = (userId == null)
                ? saleRepository.aggregateSplitPayments(start, end)
                : saleRepository.aggregateSplitPaymentsByUser(userId, start, end);

        for (Object[] row : splitRows) {
            PaymentMethod pm = toPaymentMethod(row[0]);
            BigDecimal sum   = toBigDecimal(row[1]);
            if (pm == PaymentMethod.CASH) {
                cashAmount = cashAmount.add(sum);
            } else if (pm == PaymentMethod.CARD) {
                cardAmount = cardAmount.add(sum);
            }
        }

        // 3) VAT breakdown by rate (skipped in B2B mode — quotations don't need VAT on Z-reports).
        List<VatSummaryDTO> vatBreakdown = new ArrayList<>();
        BigDecimal totalVatAmount = BigDecimal.ZERO;
        BigDecimal totalAmountExcludingVat = BigDecimal.ZERO;
        if (!b2bMode) {
            vatBreakdown = (userId == null)
                    ? saleRepository.aggregateVatBreakdown(start, end)
                    : saleRepository.aggregateVatBreakdownByUser(userId, start, end);
            for (VatSummaryDTO v : vatBreakdown) {
                if (v.getVatAmount() != null) {
                    totalVatAmount = totalVatAmount.add(v.getVatAmount());
                }
                if (v.getNet() != null) {
                    totalAmountExcludingVat = totalAmountExcludingVat.add(v.getNet());
                }
            }
        }

        // 4) Category breakdown. NULL category (Quick Sale or item without
        //    category) is renamed; a final "Total" row is appended for the
        //    frontend.
        List<CategorySummaryDTO> rawCategories = (userId == null)
                ? saleRepository.aggregateCategoryBreakdown(start, end)
                : saleRepository.aggregateCategoryBreakdownByUser(userId, start, end);

        List<CategorySummaryDTO> categories = new ArrayList<>(rawCategories.size() + 1);
        long totalCategoryCount = 0L;
        for (CategorySummaryDTO c : rawCategories) {
            if (c.getName() == null) c.setName("Quick Sale");
            if (c.getCount() != null) totalCategoryCount += c.getCount();
            categories.add(c);
        }
        categories.add(new CategorySummaryDTO("Total", totalAmount, totalCategoryCount));

        DailyReportDTO report = new DailyReportDTO(
                startDate, totalSales, totalAmount,
                cashSales, cashAmount,
                cardSales, cardAmount);
        report.setTotalVatAmount(totalVatAmount);
        report.setTotalAmountExcludingVat(totalAmountExcludingVat);
        report.setCategories(categories);
        report.setVatBreakdown(vatBreakdown);
        report.setIncludeVatInReports(!b2bMode);
        return report;
    }

    private static PaymentMethod toPaymentMethod(Object o) {
        if (o == null) return null;
        if (o instanceof PaymentMethod) return (PaymentMethod) o;
        return PaymentMethod.valueOf(o.toString());
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal) return (BigDecimal) o;
        if (o instanceof Number) return BigDecimal.valueOf(((Number) o).doubleValue());
        return new BigDecimal(o.toString());
    }

    public SaleDTO updateSale(Long id, SaleDTO saleDTO) {
        Sale existingSale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sale not found with id: " + id));
        
        // No inventory restoration - once sold, items are gone
        
        // Update basic sale information
        existingSale.setPaymentMethod(saleDTO.getPaymentMethod());
        
        // Update user relationship
        if (saleDTO.getUserId() != null) {
            User user = userRepository.findById(saleDTO.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + saleDTO.getUserId()));
            existingSale.setUser(user);
        }
        
        // Delete existing sale items from database first
        for (SaleItem existingItem : existingSale.getSaleItems()) {
            saleItemRepository.delete(existingItem);
        }
        existingSale.getSaleItems().clear();
        
        // Add new sale items with VAT calculations
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
                    saleItem.setItemName(item.getName());
                    saleItem.setItemBarcode(item.getBarcode());
                    saleItem.setBatchId(saleItemDTO.getBatchId());
                    
                    // Calculate VAT for regular items
                    BigDecimal vatRate = item.getVatRate() != null ? item.getVatRate() : new BigDecimal("23.00");
                    BigDecimal totalPriceIncludingVat = saleItemDTO.getTotalPrice();
                    BigDecimal totalPriceExcludingVat = totalPriceIncludingVat.divide(BigDecimal.ONE.add(vatRate.divide(new BigDecimal("100"))), 2, BigDecimal.ROUND_HALF_UP);
                    BigDecimal totalVatAmount = totalPriceIncludingVat.subtract(totalPriceExcludingVat);
                    
                    saleItem.setVatRate(vatRate);
                    saleItem.setVatAmount(totalVatAmount);
                    saleItem.setPriceExcludingVat(totalPriceExcludingVat);
                    
                    // No stock management - items are sold as-is
                }
            } else {
                // Quick sale with default VAT
                saleItem.setItem(null);
                saleItem.setItemName(saleItemDTO.getItemName() != null ? saleItemDTO.getItemName() : "Quick Sale");
                saleItem.setItemBarcode(saleItemDTO.getItemBarcode() != null ? saleItemDTO.getItemBarcode() : "N/A");
                saleItem.setBatchId(null);
                
                // Calculate VAT for quick sales (default 23%)
                BigDecimal vatRate = new BigDecimal("23.00");
                BigDecimal totalPriceIncludingVat = saleItemDTO.getTotalPrice();
                BigDecimal totalPriceExcludingVat = totalPriceIncludingVat.divide(BigDecimal.ONE.add(vatRate.divide(new BigDecimal("100"))), 2, BigDecimal.ROUND_HALF_UP);
                BigDecimal totalVatAmount = totalPriceIncludingVat.subtract(totalPriceExcludingVat);
                
                saleItem.setVatRate(vatRate);
                saleItem.setVatAmount(totalVatAmount);
                saleItem.setPriceExcludingVat(totalPriceExcludingVat);
            }
            
            existingSale.getSaleItems().add(saleItem);
            totalAmount = totalAmount.add(saleItemDTO.getTotalPrice());
        }
        
        existingSale.setTotalAmount(totalAmount);
        
        Sale updatedSale = saleRepository.save(existingSale);
        return convertToDTO(updatedSale);
    }
}
