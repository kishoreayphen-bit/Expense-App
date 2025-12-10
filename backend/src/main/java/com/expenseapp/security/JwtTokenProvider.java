package com.expenseapp.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class JwtTokenProvider {
    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final Key key;
    private final JwtParser jwtParser;

    public JwtTokenProvider(@Value("${JWT_SECRET:change_me_super_secret}") String secret) {
        byte[] keyBytes = Decoders.BASE64.decode(ensureBase64(secret));
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.jwtParser = Jwts.parserBuilder()
                .setSigningKey(this.key)
                .build();
    }

    // Signing key is kept private; parser is configured at construction.

    // Token generation is handled by JwtService. This provider is used for parsing and validation only.

    public String getUsernameFromJWT(String token) {
        Claims claims = jwtParser
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            log.warn("Token is null or empty");
            return false;
        }

        try {
            log.debug("Validating JWT token");
            Claims claims = jwtParser
                .parseClaimsJws(authToken)
                .getBody();
                
            // Additional validation
            if (claims.getSubject() == null || claims.getSubject().isBlank()) {
                log.warn("Token has no subject (username) claim");
                return false;
            }

            if (claims.getExpiration() == null) {
                log.warn("Token has no expiration claim");
                return false;
            }
            
            if (claims.getExpiration().before(new Date())) {
                log.warn("Token expired at: {}", claims.getExpiration());
                return false;
            }
            
            log.debug("Token is valid for subject: {}", claims.getSubject());
            return true;
            
        } catch (ExpiredJwtException ex) {
            log.warn("JWT token expired at {}: {}", ex.getClaims().getExpiration(), ex.getMessage());
            return false;
        } catch (MalformedJwtException ex) {
            log.warn("Invalid JWT token format: {}", ex.getMessage());
            return false;
        } catch (UnsupportedJwtException ex) {
            log.warn("Unsupported JWT token: {}", ex.getMessage());
            return false;
        } catch (SignatureException ex) {
            log.warn("JWT signature validation failed: {}", ex.getMessage());
            return false;
        } catch (IllegalArgumentException ex) {
            log.warn("JWT claims string is empty or invalid: {}", ex.getMessage());
            return false;
        } catch (Exception ex) {
            log.error("Unexpected error during token validation: {}", ex.getMessage(), ex);
            return false;
        }
    }

    public long getExpirationInMilliseconds() {
        // Not used by current flow; kept for compatibility if referenced.
        return 0L;
    }

    private String ensureBase64(String maybe) {
        try {
            Decoders.BASE64.decode(maybe);
            return maybe;
        } catch (Exception e) {
            return java.util.Base64.getEncoder().encodeToString(maybe.getBytes());
        }
    }
}
