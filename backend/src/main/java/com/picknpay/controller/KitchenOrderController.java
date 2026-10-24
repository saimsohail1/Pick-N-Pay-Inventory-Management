package com.picknpay.controller;

import com.picknpay.dto.KitchenOrderDTO;
import com.picknpay.dto.KitchenOrderPayDTO;
import com.picknpay.dto.SaleDTO;
import com.picknpay.entity.KitchenOrderStatus;
import com.picknpay.service.KitchenOrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kitchen-orders")
@CrossOrigin(origins = "*")
public class KitchenOrderController {

    @Autowired
    private KitchenOrderService kitchenOrderService;

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody KitchenOrderDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(kitchenOrderService.create(dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<KitchenOrderDTO>> list(@RequestParam(required = false) KitchenOrderStatus status) {
        if (status == null) {
            return ResponseEntity.ok(kitchenOrderService.listOpen());
        }
        return ResponseEntity.ok(kitchenOrderService.listByStatus(status));
    }

    @GetMapping("/open")
    public ResponseEntity<List<KitchenOrderDTO>> listOpen() {
        return ResponseEntity.ok(kitchenOrderService.listOpen());
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> counts() {
        Map<String, Long> counts = new HashMap<>();
        long open = kitchenOrderService.countOpen();
        counts.put("open", open);
        counts.put("preparing", kitchenOrderService.countByStatus(KitchenOrderStatus.PREPARING));
        counts.put("ready", kitchenOrderService.countByStatus(KitchenOrderStatus.READY));
        return ResponseEntity.ok(counts);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody KitchenOrderDTO dto) {
        try {
            return ResponseEntity.ok(kitchenOrderService.updateUnpaid(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/prepared")
    public ResponseEntity<?> markPrepared(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(kitchenOrderService.markPrepared(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            kitchenOrderService.deleteUnpaid(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> pay(@PathVariable Long id, @Valid @RequestBody KitchenOrderPayDTO payDto) {
        try {
            SaleDTO sale = kitchenOrderService.pay(id, payDto);
            return ResponseEntity.ok(sale);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
