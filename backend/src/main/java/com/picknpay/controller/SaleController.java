package com.picknpay.controller;

import com.picknpay.dto.SaleDTO;
import com.picknpay.dto.DailyReportDTO;
import com.picknpay.service.SaleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SaleController {
    
    @Autowired
    private SaleService saleService;
    
    @GetMapping
    public ResponseEntity<List<SaleDTO>> getAllSales() {
        List<SaleDTO> sales = saleService.getAllSales();
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/today")
    public ResponseEntity<List<SaleDTO>> getTodaySales(
            @RequestParam Long userId,
            @RequestParam boolean isAdmin) {
        List<SaleDTO> sales = saleService.getTodaySales(userId, isAdmin);
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SaleDTO>> getSalesByUserId(@PathVariable Long userId) {
        List<SaleDTO> sales = saleService.getSalesByUserId(userId);
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/user/{userId}/date-range")
    public ResponseEntity<List<SaleDTO>> getSalesByUserIdAndDateRange(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<SaleDTO> sales = saleService.getSalesByUserIdAndDateRange(userId, startDate, endDate);
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/admin/date-range")
    public ResponseEntity<List<SaleDTO>> getSalesByDateRangeForAdmin(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<SaleDTO> sales = saleService.getSalesByDateRangeForAdmin(startDate, endDate);
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/date-range")
    public ResponseEntity<List<SaleDTO>> getSalesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<SaleDTO> sales = saleService.getSalesByDateRange(startDate, endDate);
        return ResponseEntity.ok(sales);
    }
    
    @GetMapping("/daily-report")
    public ResponseEntity<DailyReportDTO> getDailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyReportDTO report = saleService.getDailyReport(date);
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/daily-report/user")
    public ResponseEntity<DailyReportDTO> getDailyReportByUser(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Long userId) {
        DailyReportDTO report = saleService.getDailyReportByUser(date, userId);
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/total")
    public ResponseEntity<Double> getTotalSalesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        Double total = saleService.getTotalSalesByDateRange(startDate, endDate);
        return ResponseEntity.ok(total);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<SaleDTO> getSaleById(@PathVariable Long id) {
        Optional<SaleDTO> sale = saleService.getSaleById(id);
        return sale.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<?> createSale(@Valid @RequestBody SaleDTO saleDTO) {
        try {
            SaleDTO createdSale = saleService.createSale(saleDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdSale);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error creating sale: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unexpected error: " + e.getMessage());
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSale(@PathVariable Long id, @Valid @RequestBody SaleDTO saleDTO) {
        try {
            SaleDTO updatedSale = saleService.updateSale(id, saleDTO);
            return ResponseEntity.ok(updatedSale);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error updating sale: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unexpected error: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSale(@PathVariable Long id) {
        try {
            saleService.deleteSale(id);
            return ResponseEntity.ok().body("Sale deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error deleting sale: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unexpected error: " + e.getMessage());
        }
    }
    
}
