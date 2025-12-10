package com.expenseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    private String secret;
    private long accessTokenTtlMs;
    private long refreshTokenTtlMs;

    // Getters and Setters
    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getAccessTokenTtlMs() {
        return accessTokenTtlMs;
    }

    public void setAccessTokenTtlMs(long accessTokenTtlMs) {
        this.accessTokenTtlMs = accessTokenTtlMs;
    }

    public long getRefreshTokenTtlMs() {
        return refreshTokenTtlMs;
    }

    public void setRefreshTokenTtlMs(long refreshTokenTtlMs) {
        this.refreshTokenTtlMs = refreshTokenTtlMs;
    }
}
