package com.expenseapp.notification;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationPrefsRepository extends JpaRepository<NotificationPrefs, Long> {
    Optional<NotificationPrefs> findByUser(User user);
}
