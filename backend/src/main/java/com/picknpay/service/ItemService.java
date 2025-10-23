package com.picknpay.service;

import com.picknpay.dto.ItemDTO;
import com.picknpay.entity.Item;
import com.picknpay.entity.Category;
import com.picknpay.repository.ItemRepository;
import com.picknpay.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
                    Item updatedItem = itemRepository.save(existingItem);
                    return convertToDTO(updatedItem);
                });
    }
    
    public boolean deleteItem(Long id) {
        if (itemRepository.existsById(id)) {
            itemRepository.deleteById(id);
            return true;
        }
        return false;
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
        dto.setExpiryDate(item.getExpiryDate());
        return dto;
    }
    
    private Item convertToEntity(ItemDTO dto) {
        Item item = new Item();
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setStockQuantity(dto.getStockQuantity());
        item.setBarcode(dto.getBarcode());
        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId()).orElse(null);
            item.setCategory(category);
        }
        item.setVatRate(dto.getVatRate() != null ? dto.getVatRate() : new BigDecimal("23.00"));
        item.setBatchId(dto.getBatchId());
        item.setExpiryDate(dto.getExpiryDate());
        return item;
    }
}
