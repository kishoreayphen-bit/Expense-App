package com.expenseapp.notification;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationPrefsService {

    private final NotificationPrefsRepository prefsRepository;
    private final UserRepository userRepository;

    public NotificationPrefsService(NotificationPrefsRepository prefsRepository, UserRepository userRepository) {
        this.prefsRepository = prefsRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public NotificationPrefs get(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return prefsRepository.findByUser(user).orElseGet(() -> {
            NotificationPrefs p = new NotificationPrefs();
            p.setUser(user);
            p.setCategoriesJson("{\"splits\":true,\"approvals\":true}");
            return prefsRepository.save(p);
        });
    }

    @Transactional
    public NotificationPrefs update(String email, NotificationPrefs req) {
        User user = userRepository.findByEmail(email).orElseThrow();
        NotificationPrefs p = prefsRepository.findByUser(user).orElseGet(() -> { NotificationPrefs np = new NotificationPrefs(); np.setUser(user); return np; });
        p.setCategoriesJson(req.getCategoriesJson());
        p.setQuietStart(req.getQuietStart());
        p.setQuietEnd(req.getQuietEnd());
        return prefsRepository.save(p);
    }
}
