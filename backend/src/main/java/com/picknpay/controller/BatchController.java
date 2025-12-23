package com.picknpay.controller;

import com.picknpay.dto.BatchDTO;
import com.picknpay.service.BatchService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/batches")
@CrossOrigin(origins = "*")
public class BatchController {
    
    @Autowired
    private BatchService batchService;
    
    @GetMapping
    public ResponseEntity<List<BatchDTO>> getAllBatches() {
        List<BatchDTO> batches = batchService.getAllBatches();
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<BatchDTO> getBatchById(@PathVariable Long id) {
        Optional<BatchDTO> batch = batchService.getBatchById(id);
        return batch.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<BatchDTO>> getBatchesByProduct(@PathVariable Long productId) {
        List<BatchDTO> batches = batchService.getBatchesByProduct(productId);
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/product/{productId}/batch/{batchId}")
    public ResponseEntity<BatchDTO> getBatchByProductAndBatchId(
            @PathVariable Long productId, 
            @PathVariable String batchId) {
        Optional<BatchDTO> batch = batchService.getBatchByProductAndBatchId(productId, batchId);
        return batch.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/expiring")
    public ResponseEntity<List<BatchDTO>> getExpiringBatches(@RequestParam(defaultValue = "7") Integer daysAhead) {
        List<BatchDTO> batches = batchService.getExpiringBatches(daysAhead);
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/expired")
    public ResponseEntity<List<BatchDTO>> getExpiredBatches() {
        List<BatchDTO> batches = batchService.getExpiredBatches();
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/available")
    public ResponseEntity<List<BatchDTO>> getAvailableBatches() {
        List<BatchDTO> batches = batchService.getAvailableBatches();
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/low-stock")
    public ResponseEntity<List<BatchDTO>> getLowStockBatches(@RequestParam(defaultValue = "10") Integer threshold) {
        List<BatchDTO> batches = batchService.getLowStockBatches(threshold);
        return ResponseEntity.ok(batches);
    }
    
    @GetMapping("/product/{productId}/available")
    public ResponseEntity<List<BatchDTO>> getAvailableBatchesByProductOrderByExpiry(@PathVariable Long productId) {
        List<BatchDTO> batches = batchService.getAvailableBatchesByProductOrderByExpiry(productId);
        return ResponseEntity.ok(batches);
    }
    
    @PostMapping
    public ResponseEntity<BatchDTO> createBatch(@Valid @RequestBody BatchDTO batchDTO) {
        try {
            BatchDTO createdBatch = batchService.createBatch(batchDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdBatch);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<BatchDTO> updateBatch(@PathVariable Long id, @Valid @RequestBody BatchDTO batchDTO) {
        Optional<BatchDTO> updatedBatch = batchService.updateBatch(id, batchDTO);
        return updatedBatch.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBatch(@PathVariable Long id) {
        boolean deleted = batchService.deleteBatch(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
    
    @PatchMapping("/{id}/quantity")
    public ResponseEntity<Void> updateBatchQuantity(@PathVariable Long id, @RequestParam Integer quantityChange) {
        boolean updated = batchService.updateBatchQuantity(id, quantityChange);
        return updated ? ResponseEntity.ok().build() : ResponseEntity.badRequest().build();
    }
}
