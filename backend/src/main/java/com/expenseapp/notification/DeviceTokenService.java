package com.expenseapp.notification;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    public DeviceTokenService(DeviceTokenRepository deviceTokenRepository, UserRepository userRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public DeviceToken register(String email, String token, String platform) {
        User user = userRepository.findByEmail(email).orElseThrow();
        DeviceToken dt = deviceTokenRepository.findByToken(token).orElseGet(DeviceToken::new);
        dt.setUser(user);
        dt.setToken(token);
        dt.setPlatform(platform);
        dt.setActive(true);
        return deviceTokenRepository.save(dt);
    }

    @Transactional
    public void remove(String email, Long id) {
        User user = userRepository.findByEmail(email).orElseThrow();
        DeviceToken dt = deviceTokenRepository.findById(id).orElseThrow();
        if (!dt.getUser().getId().equals(user.getId())) throw new IllegalArgumentException("Not authorized");
        deviceTokenRepository.delete(dt);
    }

    @Transactional(readOnly = true)
    public List<DeviceToken> listMine(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return deviceTokenRepository.findAllByUser(user);
    }
}
