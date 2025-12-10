package com.expenseapp.expense;

import com.expenseapp.acl.ACLEntryService;
import com.expenseapp.audit.AccessLogService;
import com.expenseapp.fx.FXService;
import com.expenseapp.group.GroupRepository;
import com.expenseapp.storage.FileStorageService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.receipt.ReceiptRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class ExpenseServiceAuditTest {

    @Test
    void get_logsDenied_whenNotOwner_andAclDenies() {
        ExpenseRepository expenseRepository = mock(ExpenseRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ReceiptRepository receiptRepository = mock(ReceiptRepository.class);
        FileStorageService fileStorageService = mock(FileStorageService.class);
        GroupRepository groupRepository = mock(GroupRepository.class);
        FXService fxService = mock(FXService.class);
        ACLEntryService aclService = mock(ACLEntryService.class);
        AccessLogService accessLogService = mock(AccessLogService.class);

        when(fxService.getBaseCurrency()).thenReturn("INR");
        when(fxService.convertToBase(any(LocalDate.class), anyString(), any(BigDecimal.class))).thenReturn(new BigDecimal("0"));

        ExpenseService svc = new ExpenseService(
                expenseRepository, 
                categoryRepository, 
                userRepository,
                receiptRepository, 
                fileStorageService, 
                groupRepository, 
                fxService, 
                aclService, 
                accessLogService
        );

        // Caller user id = 1
        User caller = new User();
        // set via reflection since we likely have no setter
        setUserId(caller, 1L);
        when(userRepository.findByEmail("u@example.com")).thenReturn(java.util.Optional.of(caller));

        // Expense owned by user id = 2
        Expense exp = new Expense();
        User owner = new User(); setUserId(owner, 2L);
        exp.setUser(owner);
        exp.setAmount(new BigDecimal("10"));
        exp.setCurrency("INR");
        exp.setOccurredOn(LocalDate.now());
        when(expenseRepository.findById(100L)).thenReturn(java.util.Optional.of(exp));

        // ACL denies
        when(aclService.hasAccess(1L, "EXPENSE", 100L, "READ")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> svc.get("u@example.com", 100L, null));
        verify(accessLogService).log(eq(1L), eq("u@example.com"), eq("EXPENSE_GET"), eq("EXPENSE"), eq(100L), eq("DENIED"), isNull());
    }

    private void setUserId(User u, Long id) {
        try {
            java.lang.reflect.Field f = User.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, id);
        } catch (Exception ignored) {}
    }
}
