package com.picknpay.service;

import com.picknpay.dto.BatchDTO;
import com.picknpay.entity.Batch;
import com.picknpay.entity.Item;
import com.picknpay.repository.BatchRepository;
import com.picknpay.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class BatchService {
    
    @Autowired
    private BatchRepository batchRepository;
    
    @Autowired
    private ItemRepository itemRepository;
    
    public List<BatchDTO> getAllBatches() {
        return batchRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public Optional<BatchDTO> getBatchById(Long id) {
        return batchRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    public List<BatchDTO> getBatchesByProduct(Long productId) {
        return batchRepository.findByProductId(productId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public Optional<BatchDTO> getBatchByProductAndBatchId(Long productId, String batchId) {
        return batchRepository.findByProductIdAndBatchId(productId, batchId)
                .map(this::convertToDTO);
    }
    
    public List<BatchDTO> getExpiringBatches(int daysAhead) {
        LocalDate expiryThreshold = LocalDate.now().plusDays(daysAhead);
        return batchRepository.findByExpiryDateLessThanEqualAndExpiryDateIsNotNull(expiryThreshold).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BatchDTO> getExpiredBatches() {
        LocalDate today = LocalDate.now();
        return batchRepository.findByExpiryDateLessThanAndExpiryDateIsNotNull(today).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BatchDTO> getAvailableBatches() {
        return batchRepository.findAvailableBatches().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BatchDTO> getLowStockBatches(Integer threshold) {
        return batchRepository.findLowStockBatches(threshold).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BatchDTO> getAvailableBatchesByProductOrderByExpiry(Long productId) {
        return batchRepository.findAvailableBatchesByProductOrderByExpiry(productId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public BatchDTO createBatch(BatchDTO batchDTO) {
        Batch batch = convertToEntity(batchDTO);
        Batch savedBatch = batchRepository.save(batch);
        return convertToDTO(savedBatch);
    }
    
    public Optional<BatchDTO> updateBatch(Long id, BatchDTO batchDTO) {
        return batchRepository.findById(id)
                .map(existingBatch -> {
                    existingBatch.setBatchId(batchDTO.getBatchId());
                    existingBatch.setExpiryDate(batchDTO.getExpiryDate());
                    existingBatch.setManufactureDate(batchDTO.getManufactureDate());
                    existingBatch.setQuantity(batchDTO.getQuantity());
                    existingBatch.setReceivedDate(batchDTO.getReceivedDate());
                    existingBatch.setSupplierId(batchDTO.getSupplierId());
                    if (batchDTO.getProductId() != null) {
                        Item product = itemRepository.findById(batchDTO.getProductId()).orElse(null);
                        existingBatch.setProduct(product);
                    }
                    Batch updatedBatch = batchRepository.save(existingBatch);
                    return convertToDTO(updatedBatch);
                });
    }
    
    public boolean deleteBatch(Long id) {
        if (batchRepository.existsById(id)) {
            batchRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    public boolean updateBatchQuantity(Long batchId, Integer quantityChange) {
        Optional<Batch> batchOpt = batchRepository.findById(batchId);
        if (batchOpt.isPresent()) {
            Batch batch = batchOpt.get();
            int newQuantity = batch.getQuantity() + quantityChange;
            if (newQuantity >= 0) {
                batch.setQuantity(newQuantity);
                batchRepository.save(batch);
                return true;
            }
        }
        return false;
    }
    
    private BatchDTO convertToDTO(Batch batch) {
        BatchDTO dto = new BatchDTO();
        dto.setId(batch.getId());
        dto.setProductId(batch.getProduct() != null ? batch.getProduct().getId() : null);
        dto.setBatchId(batch.getBatchId());
        dto.setExpiryDate(batch.getExpiryDate());
        dto.setManufactureDate(batch.getManufactureDate());
        dto.setQuantity(batch.getQuantity());
        dto.setReceivedDate(batch.getReceivedDate());
        dto.setSupplierId(batch.getSupplierId());
        
        // Add product info for display
        if (batch.getProduct() != null) {
            dto.setProductName(batch.getProduct().getName());
            dto.setProductBarcode(batch.getProduct().getBarcode());
        }
        
        return dto;
    }
    
    private Batch convertToEntity(BatchDTO dto) {
        Batch batch = new Batch();
        batch.setBatchId(dto.getBatchId());
        batch.setExpiryDate(dto.getExpiryDate());
        batch.setManufactureDate(dto.getManufactureDate());
        batch.setQuantity(dto.getQuantity());
        batch.setReceivedDate(dto.getReceivedDate());
        batch.setSupplierId(dto.getSupplierId());
        
        if (dto.getProductId() != null) {
            Item product = itemRepository.findById(dto.getProductId()).orElse(null);
            batch.setProduct(product);
        }
        
        return batch;
    }
}
