package com.expenseapp.dashboard;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DashboardPrefsRepository extends JpaRepository<DashboardPrefs, Long> {
    Optional<DashboardPrefs> findByUser(User user);
}
