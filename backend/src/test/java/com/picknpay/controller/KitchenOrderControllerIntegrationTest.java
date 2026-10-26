package com.picknpay.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.picknpay.dto.KitchenOrderDTO;
import com.picknpay.dto.KitchenOrderItemDTO;
import com.picknpay.entity.PaymentMethod;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class KitchenOrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void clearTicketCounter() {
        entityManager.createNativeQuery("DELETE FROM order_ticket_counters").executeUpdate();
    }

    @Test
    void sendBillPayAndDeleteWorkThroughHttp() throws Exception {
        JsonNode first = read(sendOrder("Chapli Kebab"));
        JsonNode second = read(sendOrder("Chicken Burger"));

        assertEquals(1, first.get("displayOrderNo").asInt());
        assertEquals(2, second.get("displayOrderNo").asInt());

        MvcResult openBefore = mockMvc.perform(get("/api/kitchen-orders/open"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode openOrders = objectMapper.readTree(openBefore.getResponse().getContentAsString());
        assertEquals(2, openOrders.size());
        assertEquals(1, openOrders.get(0).get("displayOrderNo").asInt());
        assertEquals(2, openOrders.get(1).get("displayOrderNo").asInt());

        mockMvc.perform(post("/api/kitchen-orders/" + first.get("id").asLong() + "/pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentMethod\":\"CASH\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/kitchen-orders/" + second.get("id").asLong()))
                .andExpect(status().isOk());

        MvcResult openAfter = mockMvc.perform(get("/api/kitchen-orders/open"))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals("[]", openAfter.getResponse().getContentAsString());

        mockMvc.perform(delete("/api/kitchen-orders/" + first.get("id").asLong()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void eatInRejectsATakenTable() throws Exception {
        KitchenOrderDTO first = new KitchenOrderDTO();
        first.setOrderType(com.picknpay.entity.KitchenOrderType.EAT_IN);
        first.setTableNumber(3);
        KitchenOrderItemDTO line = new KitchenOrderItemDTO();
        line.setQuantity(1);
        line.setUnitPrice(new BigDecimal("5.99"));
        line.setTotalPrice(new BigDecimal("5.99"));
        line.setItemName("Chapli Kebab");
        line.setVatRate(new BigDecimal("9.00"));
        first.setItems(List.of(line));

        mockMvc.perform(post("/api/kitchen-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        KitchenOrderDTO second = new KitchenOrderDTO();
        second.setOrderType(com.picknpay.entity.KitchenOrderType.EAT_IN);
        second.setTableNumber(3);
        second.setItems(List.of(line));
        MvcResult taken = mockMvc.perform(post("/api/kitchen-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(second)))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertEquals("Table 3 is already taken", taken.getResponse().getContentAsString());
    }

    @Test
    void invalidKitchenOrderIsBadRequestNotForbidden() throws Exception {
        mockMvc.perform(post("/api/kitchen-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void httpEditAddsItemsAndKeepsOrderNumber() throws Exception {
        JsonNode created = read(sendOrder("Chapli Kebab"));
        KitchenOrderDTO update = new KitchenOrderDTO();
        KitchenOrderItemDTO kebab = new KitchenOrderItemDTO();
        kebab.setQuantity(1);
        kebab.setUnitPrice(new BigDecimal("5.99"));
        kebab.setTotalPrice(new BigDecimal("5.99"));
        kebab.setItemName("Chapli Kebab");
        kebab.setVatRate(new BigDecimal("9.00"));
        KitchenOrderItemDTO coke = new KitchenOrderItemDTO();
        coke.setQuantity(1);
        coke.setUnitPrice(new BigDecimal("1.50"));
        coke.setTotalPrice(new BigDecimal("1.50"));
        coke.setItemName("Coke");
        coke.setVatRate(new BigDecimal("23.00"));
        update.setItems(List.of(kebab, coke));

        MvcResult edited = mockMvc.perform(put("/api/kitchen-orders/" + created.get("id").asLong())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(edited.getResponse().getContentAsString());
        assertEquals(created.get("displayOrderNo").asInt(), body.get("displayOrderNo").asInt());
        assertEquals(2, body.get("items").size());
    }

    @Test
    void httpSendSkipsNumberStillSittingOnOrders() throws Exception {
        JsonNode leftover = read(sendOrder("Leftover"));
        assertEquals(1, leftover.get("displayOrderNo").asInt());
        entityManager.createNativeQuery("UPDATE order_ticket_counters SET last_no = 99").executeUpdate();
        entityManager.flush();

        JsonNode next = read(sendOrder("New order"));

        assertEquals(2, next.get("displayOrderNo").asInt());
        MvcResult open = mockMvc.perform(get("/api/kitchen-orders/open"))
                .andExpect(status().isOk())
                .andReturn();
        String body = open.getResponse().getContentAsString();
        assertTrue(body.contains("\"displayOrderNo\":1"));
        assertTrue(body.contains("\"displayOrderNo\":2"));
    }

    private MvcResult sendOrder(String name) throws Exception {
        KitchenOrderItemDTO line = new KitchenOrderItemDTO();
        line.setQuantity(1);
        line.setUnitPrice(new BigDecimal("5.99"));
        line.setTotalPrice(new BigDecimal("5.99"));
        line.setItemName(name);
        line.setVatRate(new BigDecimal("9.00"));

        KitchenOrderDTO dto = new KitchenOrderDTO();
        dto.setItems(List.of(line));

        return mockMvc.perform(post("/api/kitchen-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
