package com.expenseapp.token;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
    java.util.List<RefreshToken> findAllByUserAndRevokedIsFalse(User user);
    Optional<RefreshToken> findByIdAndUser(Long id, User user);
}
