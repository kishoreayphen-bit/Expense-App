package com.expenseapp.budget;

import com.expenseapp.group.Group;
import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findAllByUserAndPeriod(User user, String period);
    List<Budget> findAllByGroupAndPeriod(Group group, String period);
}
