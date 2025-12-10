package com.expenseapp.expense;

import com.expenseapp.audit.AccessLogService;
import com.expenseapp.fx.FXService;
import com.expenseapp.group.GroupRepository;
import com.expenseapp.storage.FileStorageService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.expense.dto.ExpenseView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExpenseServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private com.expenseapp.receipt.ReceiptRepository receiptRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private GroupRepository groupRepository;
    @Mock
    private FXService fxService;
    @Mock
    private com.expenseapp.acl.ACLEntryService aclService;
    @Mock
    private AccessLogService accessLogService;

    @InjectMocks
    private ExpenseService expenseService;

    private User user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        user = new User();
        user.setEmail("admin@demo.local");
        when(userRepository.findByEmail("admin@demo.local")).thenReturn(Optional.of(user));
        when(fxService.getBaseCurrency()).thenReturn("INR");
        when(fxService.convertToBase(any(), anyString(), any())).thenReturn(BigDecimal.ONE);
        when(fxService.ensureRate(any(LocalDate.class), anyString())).thenReturn(BigDecimal.ONE);
    }

    @Test
    void list_personal_returns_only_expenses_with_no_company() {
        Expense e1 = new Expense();
        e1.setUser(user); e1.setOccurredOn(LocalDate.now()); e1.setCurrency("INR"); e1.setAmount(new BigDecimal("10"));
        e1.setCompanyId(null);
        Expense e2 = new Expense();
        e2.setUser(user); e2.setOccurredOn(LocalDate.now()); e2.setCurrency("INR"); e2.setAmount(new BigDecimal("20"));
        e2.setCompanyId(5L);
        when(expenseRepository.findAll()).thenReturn(List.of(e1, e2));

        List<ExpenseView> result = expenseService.list("admin@demo.local", LocalDate.now().minusDays(1), LocalDate.now().plusDays(1), null);
        assertThat(result).allMatch(v -> v.getCompanyId() == null);
        assertThat(result).hasSize(1);
    }

    @Test
    void list_company_returns_only_expenses_for_that_company() {
        Expense e1 = new Expense();
        e1.setUser(user); e1.setOccurredOn(LocalDate.now()); e1.setCurrency("INR"); e1.setAmount(new BigDecimal("10"));
        e1.setCompanyId(7L);
        Expense e2 = new Expense();
        e2.setUser(user); e2.setOccurredOn(LocalDate.now()); e2.setCurrency("INR"); e2.setAmount(new BigDecimal("20"));
        e2.setCompanyId(5L);
        Expense e3 = new Expense();
        e3.setUser(user); e3.setOccurredOn(LocalDate.now()); e3.setCurrency("INR"); e3.setAmount(new BigDecimal("30"));
        e3.setCompanyId(null);
        when(expenseRepository.findAll()).thenReturn(List.of(e1, e2, e3));

        List<ExpenseView> result = expenseService.list("admin@demo.local", null, null, 7L);
        assertThat(result).allMatch(v -> v.getCompanyId() != null && v.getCompanyId().equals(7L));
        assertThat(result).hasSize(1);
    }

    @Test
    void create_sets_companyId_when_positive_and_null_when_not_positive() {
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(groupRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> {
            Expense e = inv.getArgument(0);
            return e;
        });

        var req = new com.expenseapp.expense.dto.ExpenseCreateRequest();
        req.setAmount(new BigDecimal("123.45"));
        req.setCurrency("INR");
        req.setOccurredOn(LocalDate.now());

        expenseService.create("admin@demo.local", req, 9L);
        ArgumentCaptor<Expense> cap1 = ArgumentCaptor.forClass(Expense.class);
        verify(expenseRepository, atLeastOnce()).save(cap1.capture());
        assertThat(cap1.getValue().getCompanyId()).isEqualTo(9L);

        expenseService.create("admin@demo.local", req, 0L);
        ArgumentCaptor<Expense> cap2 = ArgumentCaptor.forClass(Expense.class);
        verify(expenseRepository, atLeast(2)).save(cap2.capture());
        assertThat(cap2.getValue().getCompanyId()).isNull();
    }
}
