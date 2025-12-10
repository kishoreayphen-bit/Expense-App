package com.expenseapp.receipt;

import com.expenseapp.expense.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    List<Receipt> findAllByExpense(Expense expense);
}
