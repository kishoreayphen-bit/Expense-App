package com.expenseapp.notification;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class NotificationPublisher {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationPublisher(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void publish(Long userId, String type, String title, String body, String dataJson) {
        publish(userId, type, title, body, dataJson, null);
    }

    @Transactional
    public void publish(Long userId, String type, String title, String body, String dataJson, Long companyId) {
        User user = userRepository.findById(userId).orElseThrow();
        // Basic dedup window: 2 minutes for same (type,title)
        Instant windowStart = Instant.now().minus(Duration.ofMinutes(2));
        long dup = notificationRepository.countRecentDuplicates(userId, type, title, windowStart);
        if (dup > 0) return;
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setData(dataJson);
        n.setCompanyId(companyId);
        notificationRepository.save(n);
    }
}
