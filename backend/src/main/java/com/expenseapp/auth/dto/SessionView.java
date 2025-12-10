package com.expenseapp.auth.dto;

import java.time.Instant;

public class SessionView {
    private Long id;
    private Instant createdAt;
    private Instant expiresAt;
    private boolean revoked;

    public SessionView(Long id, Instant createdAt, Instant expiresAt, boolean revoked) {
        this.id = id;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.revoked = revoked;
    }

    public Long getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isRevoked() { return revoked; }
}
