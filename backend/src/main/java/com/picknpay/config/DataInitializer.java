package com.picknpay.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        // Catalog is loaded from data/import-retail-items-vape-shop.sql — no demo seed data.
    }
}
