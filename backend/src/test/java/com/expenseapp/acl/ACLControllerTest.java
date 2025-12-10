package com.expenseapp.acl;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ACLController.class)
class ACLControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ACLEntryService aclEntryService;

    @Test
    @WithMockUser(username = "user@example.com")
    void share_createsGrant() throws Exception {
        ACLEntry e = new ACLEntry();
        e.setResourceType("EXPENSE"); e.setResourceId(10L);
        e.setPrincipalType("GROUP"); e.setPrincipalId(5L);
        e.setPermission("READ");
        when(aclEntryService.share(anyString(), anyString(), anyLong(), anyString(), anyLong(), anyString())).thenReturn(e);

        String body = "{\n" +
                "  \"resourceType\": \"EXPENSE\",\n" +
                "  \"resourceId\": 10,\n" +
                "  \"principalType\": \"GROUP\",\n" +
                "  \"principalId\": 5,\n" +
                "  \"permission\": \"READ\"\n" +
                "}";

        mockMvc.perform(post("/api/v1/acl/share")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resourceType", is("EXPENSE")))
                .andExpect(jsonPath("$.principalType", is("GROUP")))
                .andExpect(jsonPath("$.permission", is("READ")));
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void revoke_deletesGrant() throws Exception {
        String body = "{\n" +
                "  \"resourceType\": \"RECEIPT\",\n" +
                "  \"resourceId\": 44,\n" +
                "  \"principalType\": \"USER\",\n" +
                "  \"principalId\": 2,\n" +
                "  \"permission\": \"WRITE\"\n" +
                "}";

        mockMvc.perform(delete("/api/v1/acl/share")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void list_returnsGrants() throws Exception {
        ACLEntry e1 = new ACLEntry(); e1.setPrincipalType("USER"); e1.setPrincipalId(1L); e1.setPermission("READ");
        ACLEntry e2 = new ACLEntry(); e2.setPrincipalType("GROUP"); e2.setPrincipalId(3L); e2.setPermission("WRITE");
        when(aclEntryService.list(eq("EXPENSE"), eq(99L))).thenReturn(List.of(e1, e2));

        mockMvc.perform(get("/api/v1/acl/list")
                        .param("resourceType", "EXPENSE")
                        .param("resourceId", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].principalType", is("USER")))
                .andExpect(jsonPath("$[1].permission", is("WRITE")));
    }
}
