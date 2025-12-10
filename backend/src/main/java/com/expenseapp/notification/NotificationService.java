package com.expenseapp.notification;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<Notification> list(String email, boolean unreadOnly) {
        return list(email, unreadOnly, null);
    }

    @Transactional(readOnly = true)
    public List<Notification> list(String email, boolean unreadOnly, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        
        if (companyId != null) {
            // Filter by company context
            if (unreadOnly) {
                return notificationRepository.findAllByUserAndCompanyIdAndReadAtIsNullOrderByCreatedAtDesc(user, companyId);
            }
            return notificationRepository.findAllByUserAndCompanyIdOrderByCreatedAtDesc(user, companyId);
        } else {
            // Personal context - show only notifications without companyId
            if (unreadOnly) {
                return notificationRepository.findAllByUserAndCompanyIdIsNullAndReadAtIsNullOrderByCreatedAtDesc(user);
            }
            return notificationRepository.findAllByUserAndCompanyIdIsNullOrderByCreatedAtDesc(user);
        }
    }

    @Transactional
    public void markRead(String email, List<Long> ids) {
        User user = userRepository.findByEmail(email).orElseThrow();
        var now = Instant.now();
        ids.forEach(id -> {
            Notification n = notificationRepository.findById(id).orElseThrow();
            if (!n.getUser().getId().equals(user.getId())) return;
            if (n.getReadAt() == null) {
                n.setReadAt(now);
            }
        });
    }

    @Transactional
    public void markAllRead(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        var list = notificationRepository.findAllByUserAndReadAtIsNullOrderByCreatedAtDesc(user);
        var now = Instant.now();
        list.forEach(n -> n.setReadAt(now));
    }
}
