package com.expenseapp.settlement;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementReminderRepository extends JpaRepository<SettlementReminder, Long> {
    List<SettlementReminder> findAllByUser(User user);
}
