package com.picknpay.service;

import com.picknpay.dto.ItemDTO;
import com.picknpay.dto.PaginatedResponse;
import com.picknpay.entity.Item;
import com.picknpay.entity.Category;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ItemService {
    
    @Autowired
    private ItemRepository itemRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    public List<ItemDTO> getAllItems() {
        return itemRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public PaginatedResponse<ItemDTO> getAllItemsPaginated(int page, int size, String sortBy, String sortDir) {
        // Default sorting by id descending (newest first)
        Sort sort = sortDir != null && sortDir.equalsIgnoreCase("asc") 
            ? Sort.by(sortBy != null ? sortBy : "id").ascending()
            : Sort.by(sortBy != null ? sortBy : "id").descending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Item> itemPage = itemRepository.findAll(pageable);
        
        List<ItemDTO> content = itemPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        
        return new PaginatedResponse<>(
            content,
            itemPage.getNumber(),
            itemPage.getSize(),
            itemPage.getTotalElements(),
            itemPage.getTotalPages(),
            itemPage.isFirst(),
            itemPage.isLast()
        );
    }
    
    public Optional<ItemDTO> getItemById(Long id) {
        return itemRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    public Optional<ItemDTO> getItemByBarcode(String barcode) {
        return itemRepository.findByBarcode(barcode)
                .map(this::convertToDTO);
    }
    
    public List<ItemDTO> getItemsByCategory(Long categoryId) {
        return itemRepository.findByCategoryId(categoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<ItemDTO> searchItemsByName(String name) {
        return itemRepository.findByNameContainingIgnoreCase(name).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<ItemDTO> getAvailableItems() {
        return itemRepository.findAvailableItems().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<ItemDTO> getLowStockItems(Integer threshold) {
        return itemRepository.findLowStockItems(threshold).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public ItemDTO createItem(ItemDTO itemDTO) {
        Item item = convertToEntity(itemDTO);
        Item savedItem = itemRepository.save(item);
        return convertToDTO(savedItem);
    }
    
    public Optional<ItemDTO> updateItem(Long id, ItemDTO itemDTO) {
        return itemRepository.findById(id)
                .map(existingItem -> {
                    existingItem.setName(itemDTO.getName());
                    existingItem.setDescription(itemDTO.getDescription());
                    existingItem.setPrice(itemDTO.getPrice());
                    existingItem.setStockQuantity(itemDTO.getStockQuantity());
                    existingItem.setBarcode(itemDTO.getBarcode());
                    
                    // Update category if provided
                    Category category = null;
                    if (itemDTO.getCategoryId() != null && !itemDTO.getCategoryId().toString().trim().isEmpty()) {
                        try {
                            category = categoryRepository.findById(itemDTO.getCategoryId()).orElse(null);
                            existingItem.setCategory(category);
                        } catch (Exception e) {
                            // If category lookup fails, set category to null
                            existingItem.setCategory(null);
                        }
                    } else {
                        existingItem.setCategory(null);
                    }
                    
                    // VAT logic: Use provided VAT, or category's VAT, or default 23%
                    if (itemDTO.getVatRate() != null) {
                        // User explicitly set VAT - use it
                        existingItem.setVatRate(itemDTO.getVatRate());
                    } else if (category != null && category.getVatRate() != null) {
                        // No VAT provided, but category has VAT - use category's VAT
                        existingItem.setVatRate(category.getVatRate());
                    } else {
                        // No VAT and no category - use default 23%
                        existingItem.setVatRate(new BigDecimal("23.00"));
                    }
                    
                    existingItem.setBatchId(itemDTO.getBatchId());
                    existingItem.setGeneralExpiryDate(itemDTO.getGeneralExpiryDate());
                    
                    Item updatedItem = itemRepository.save(existingItem);
                    return convertToDTO(updatedItem);
                });
    }
    
    public boolean deleteItem(Long id) {
        try {
            if (itemRepository.existsById(id)) {
                itemRepository.deleteById(id);
                return true;
            }
            return false;
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Item cannot be deleted because it's referenced by sales or other entities
            throw new RuntimeException("Cannot delete item: It is referenced by existing sales or other records.");
        } catch (Exception e) {
            throw new RuntimeException("Error deleting item: " + e.getMessage());
        }
    }
    
    
    public boolean updateStock(Long itemId, Integer quantityChange) {
        Optional<Item> itemOpt = itemRepository.findById(itemId);
        if (itemOpt.isPresent()) {
            Item item = itemOpt.get();
            int newStock = item.getStockQuantity() + quantityChange;
            if (newStock >= 0) {
                item.setStockQuantity(newStock);
                itemRepository.save(item);
                return true;
            }
        }
        return false;
    }
    
    private ItemDTO convertToDTO(Item item) {
        ItemDTO dto = new ItemDTO();
        dto.setId(item.getId());
        dto.setName(item.getName());
        dto.setDescription(item.getDescription());
        dto.setPrice(item.getPrice());
        dto.setStockQuantity(item.getStockQuantity());
        dto.setBarcode(item.getBarcode());
        if (item.getCategory() != null) {
            dto.setCategoryId(item.getCategory().getId());
            dto.setCategoryName(item.getCategory().getName());
        }
        dto.setVatRate(item.getVatRate());
        dto.setBatchId(item.getBatchId());
        dto.setGeneralExpiryDate(item.getGeneralExpiryDate());
        return dto;
    }
    
    private Item convertToEntity(ItemDTO dto) {
        Item item = new Item();
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setStockQuantity(dto.getStockQuantity());
        item.setBarcode(dto.getBarcode());
        
        // Set category and use category's VAT as default if category exists and VAT not explicitly set
        Category category = null;
        if (dto.getCategoryId() != null && !dto.getCategoryId().toString().trim().isEmpty()) {
            try {
                category = categoryRepository.findById(dto.getCategoryId()).orElse(null);
                item.setCategory(category);
            } catch (Exception e) {
                // If category lookup fails, set category to null
                item.setCategory(null);
            }
        } else {
            item.setCategory(null);
        }
        
        // VAT logic: Use provided VAT, or category's VAT, or default 23%
        if (dto.getVatRate() != null) {
            // User explicitly set VAT - use it
            item.setVatRate(dto.getVatRate());
        } else if (category != null && category.getVatRate() != null) {
            // No VAT provided, but category has VAT - use category's VAT
            item.setVatRate(category.getVatRate());
        } else {
            // No VAT and no category - use default 23%
            item.setVatRate(new BigDecimal("23.00"));
        }
        
        item.setBatchId(dto.getBatchId());
        item.setGeneralExpiryDate(dto.getGeneralExpiryDate());
        return item;
    }
}
