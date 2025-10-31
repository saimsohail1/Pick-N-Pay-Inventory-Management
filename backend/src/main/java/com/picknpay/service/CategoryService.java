package com.picknpay.service;

import com.picknpay.dto.CategoryDTO;
import com.picknpay.entity.Category;
import com.picknpay.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public List<CategoryDTO> getAllActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<CategoryDTO> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }


    public Optional<CategoryDTO> getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .map(this::convertToDTO);
    }

    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        Category category = convertToEntity(categoryDTO);
        category.setIsActive(true);
        Category savedCategory = categoryRepository.save(category);
        return convertToDTO(savedCategory);
    }

    public Optional<CategoryDTO> updateCategory(Long id, CategoryDTO categoryDTO) {
        return categoryRepository.findById(id)
                .map(existingCategory -> {
                    existingCategory.setName(categoryDTO.getName());
                    existingCategory.setDescription(categoryDTO.getDescription());
                    existingCategory.setIsActive(categoryDTO.getIsActive());
                    existingCategory.setDisplayOnPos(categoryDTO.getDisplayOnPos());
                    Category updatedCategory = categoryRepository.save(existingCategory);
                    return convertToDTO(updatedCategory);
                });
    }

    public boolean deleteCategory(Long id) {
        try {
            if (categoryRepository.existsById(id)) {
                categoryRepository.deleteById(id);
                return true;
            }
            return false;
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Category cannot be deleted because it's referenced by items
            throw new RuntimeException("Cannot delete category: It is referenced by existing items.");
        } catch (Exception e) {
            throw new RuntimeException("Error deleting category: " + e.getMessage());
        }
    }

    private Category convertToEntity(CategoryDTO dto) {
        Category category = new Category();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setIsActive(dto.getIsActive());
        category.setDisplayOnPos(dto.getDisplayOnPos());
        return category;
    }

    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setIsActive(category.getIsActive());
        dto.setDisplayOnPos(category.getDisplayOnPos());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());
        return dto;
    }

}