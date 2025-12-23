package com.picknpay.config;

import com.picknpay.entity.Category;
import com.picknpay.entity.Item;
import com.picknpay.repository.CategoryRepository;
import com.picknpay.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Override
    public void run(String... args) throws Exception {
        // Check if data already exists
        if (categoryRepository.count() > 0) {
            return;
        }

        // Create Quick Sale category
        Category quickSaleCategory = new Category("Quick Sale", "Quick sale items for fast transactions");
        quickSaleCategory.setDisplayOnPos(true);
        quickSaleCategory = categoryRepository.save(quickSaleCategory);

        // Create Tobacco category
        Category tobaccoCategory = new Category("Tobacco", "Tobacco products and cigarettes");
        tobaccoCategory.setDisplayOnPos(true);
        tobaccoCategory = categoryRepository.save(tobaccoCategory);

        // Add tobacco items
        Item amberLeaf = new Item("Amber Leaf", "Amber Leaf tobacco", new BigDecimal("12.50"), 50, "123456789");
        amberLeaf.setCategory(tobaccoCategory);
        Item marlboro = new Item("Marlboro", "Marlboro cigarettes", new BigDecimal("8.50"), 30, "987654321");
        marlboro.setCategory(tobaccoCategory);
        Item camel = new Item("Camel", "Camel cigarettes", new BigDecimal("9.00"), 25, "456789123");
        camel.setCategory(tobaccoCategory);
        
        itemRepository.save(amberLeaf);
        itemRepository.save(marlboro);
        itemRepository.save(camel);

        // Create Snacks category
        Category snacksCategory = new Category("Snacks", "Chips, chocolates, and other snacks");
        snacksCategory = categoryRepository.save(snacksCategory);

        // Add snack items
        Item lays = new Item("Lays Chips", "Lays potato chips", new BigDecimal("2.50"), 100, "111222333");
        lays.setCategory(snacksCategory);
        Item kitkat = new Item("KitKat", "KitKat chocolate bar", new BigDecimal("1.50"), 75, "444555666");
        kitkat.setCategory(snacksCategory);
        Item snickers = new Item("Snickers", "Snickers chocolate bar", new BigDecimal("2.00"), 60, "777888999");
        snickers.setCategory(snacksCategory);
        
        itemRepository.save(lays);
        itemRepository.save(kitkat);
        itemRepository.save(snickers);

        // Create Beverages category
        Category beveragesCategory = new Category("Beverages", "Soft drinks, water, and other beverages");
        beveragesCategory = categoryRepository.save(beveragesCategory);

        // Add beverage items
        Item cocaCola = new Item("Coca Cola", "Coca Cola 330ml", new BigDecimal("1.80"), 80, "101112131");
        cocaCola.setCategory(beveragesCategory);
        Item pepsi = new Item("Pepsi", "Pepsi 330ml", new BigDecimal("1.80"), 70, "141516171");
        pepsi.setCategory(beveragesCategory);
        Item water = new Item("Water", "Bottled water 500ml", new BigDecimal("1.00"), 120, "181920212");
        water.setCategory(beveragesCategory);
        
        itemRepository.save(cocaCola);
        itemRepository.save(pepsi);
        itemRepository.save(water);

        // Create Groceries category
        Category groceriesCategory = new Category("Groceries", "Basic grocery items");
        groceriesCategory = categoryRepository.save(groceriesCategory);

        // Add grocery items
        Item bread = new Item("Bread", "White bread loaf", new BigDecimal("1.20"), 40, "232425262");
        bread.setCategory(groceriesCategory);
        Item milk = new Item("Milk", "Fresh milk 1L", new BigDecimal("2.50"), 35, "272829303");
        milk.setCategory(groceriesCategory);
        Item eggs = new Item("Eggs", "Dozen eggs", new BigDecimal("3.00"), 20, "313233343");
        eggs.setCategory(groceriesCategory);
        
        itemRepository.save(bread);
        itemRepository.save(milk);
        itemRepository.save(eggs);

        System.out.println("Sample data initialized successfully!");
    }
}
