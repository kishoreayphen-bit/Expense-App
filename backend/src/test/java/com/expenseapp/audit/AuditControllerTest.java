package com.expenseapp.audit;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditController.class)
class AuditControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccessLogRepository repo;

    @Test
    @WithMockUser(username = "admin@example.com")
    void logs_filtersAndPaginates() throws Exception {
        AccessLog a = new AccessLog();
        a.setAction("EXPENSE_GET"); a.setResourceType("EXPENSE"); a.setResourceId(1L); a.setOutcome("ALLOWED");
        // adjust createdAt for ordering
        setCreatedAt(a, Instant.parse("2025-09-12T00:00:00Z"));

        AccessLog b = new AccessLog();
        b.setAction("RECEIPT_DOWNLOAD"); b.setResourceType("RECEIPT"); b.setResourceId(2L); b.setOutcome("DENIED");
        setCreatedAt(b, Instant.parse("2025-09-13T00:00:00Z"));

        Mockito.when(repo.findAll()).thenReturn(List.of(a, b));

        mockMvc.perform(get("/api/v1/audit/logs")
                        .param("from", "2025-09-11")
                        .param("to", "2025-09-13")
                        .param("offset", "0")
                        .param("limit", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(2)))
                .andExpect(jsonPath("$.limit", is(1)))
                .andExpect(jsonPath("$.items", hasSize(1)))
                // sorted desc by createdAt, so first is b
                .andExpect(jsonPath("$.items[0].action", is("RECEIPT_DOWNLOAD")));
    }

    private void setCreatedAt(AccessLog log, Instant when) {
        try {
            java.lang.reflect.Field f = AccessLog.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(log, when);
        } catch (Exception ignored) {}
    }
}
