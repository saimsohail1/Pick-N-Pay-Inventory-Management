package com.picknpay.controller;

import com.picknpay.dto.ItemDTO;
import com.picknpay.service.ItemService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/items")
@CrossOrigin(origins = "*")
public class ItemController {
    
    @Autowired
    private ItemService itemService;
    
    @GetMapping
    public ResponseEntity<List<ItemDTO>> getAllItems() {
        List<ItemDTO> items = itemService.getAllItems();
        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ItemDTO> getItemById(@PathVariable Long id) {
        Optional<ItemDTO> item = itemService.getItemById(id);
        return item.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<ItemDTO> getItemByBarcode(@PathVariable String barcode) {
        Optional<ItemDTO> item = itemService.getItemByBarcode(barcode);
        return item.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ItemDTO>> getItemsByCategory(@PathVariable Long categoryId) {
        List<ItemDTO> items = itemService.getItemsByCategory(categoryId);
        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<ItemDTO>> searchItemsByName(@RequestParam String name) {
        List<ItemDTO> items = itemService.searchItemsByName(name);
        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/available")
    public ResponseEntity<List<ItemDTO>> getAvailableItems() {
        List<ItemDTO> items = itemService.getAvailableItems();
        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/low-stock")
    public ResponseEntity<List<ItemDTO>> getLowStockItems(@RequestParam(defaultValue = "10") Integer threshold) {
        List<ItemDTO> items = itemService.getLowStockItems(threshold);
        return ResponseEntity.ok(items);
    }
    
    @PostMapping
    public ResponseEntity<ItemDTO> createItem(@Valid @RequestBody ItemDTO itemDTO) {
        try {
            ItemDTO createdItem = itemService.createItem(itemDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdItem);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ItemDTO> updateItem(@PathVariable Long id, @Valid @RequestBody ItemDTO itemDTO) {
        Optional<ItemDTO> updatedItem = itemService.updateItem(id, itemDTO);
        return updatedItem.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        boolean deleted = itemService.deleteItem(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
    
    @PatchMapping("/{id}/stock")
    public ResponseEntity<Void> updateStock(@PathVariable Long id, @RequestParam Integer quantityChange) {
        boolean updated = itemService.updateStock(id, quantityChange);
        return updated ? ResponseEntity.ok().build() : ResponseEntity.badRequest().build();
    }
}
