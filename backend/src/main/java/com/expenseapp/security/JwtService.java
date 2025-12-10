package com.expenseapp.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private final Key key;
    private final JwtParser jwtParser;

    public JwtService(@Value("${JWT_SECRET:change_me_super_secret}") String secret) {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(ensureBase64(secret));
            this.key = Keys.hmacShaKeyFor(keyBytes);
            this.jwtParser = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build();
        } catch (Exception e) {
            log.error("Failed to initialize JwtService with the provided secret", e);
            throw new IllegalStateException("Failed to initialize JWT service", e);
        }
    }

    public String generateToken(String subject, long ttlMinutes) {
        if (subject == null || subject.trim().isEmpty()) {
            throw new IllegalArgumentException("Subject cannot be null or empty");
        }
        if (ttlMinutes <= 0) {
            throw new IllegalArgumentException("TTL must be greater than 0");
        }

        try {
            Instant now = Instant.now();
            return Jwts.builder()
                    .setSubject(subject)
                    .claim("email", subject) // Add email as explicit claim
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(now.plusSeconds(ttlMinutes * 60)))
                    .signWith(key, SignatureAlgorithm.HS256)
                    .compact();
        } catch (Exception e) {
            log.error("Failed to generate JWT token", e);
            throw new JwtException("Failed to generate token: " + e.getMessage(), e);
        }
    }
    
    // Overloaded method to include user ID in token
    public String generateToken(String subject, Long userId, long ttlMinutes) {
        if (subject == null || subject.trim().isEmpty()) {
            throw new IllegalArgumentException("Subject cannot be null or empty");
        }
        if (ttlMinutes <= 0) {
            throw new IllegalArgumentException("TTL must be greater than 0");
        }

        try {
            Instant now = Instant.now();
            var builder = Jwts.builder()
                    .setSubject(subject)
                    .claim("email", subject)
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(now.plusSeconds(ttlMinutes * 60)));
            
            if (userId != null) {
                builder.claim("userId", userId);
            }
            
            return builder.signWith(key, SignatureAlgorithm.HS256).compact();
        } catch (Exception e) {
            log.error("Failed to generate JWT token", e);
            throw new JwtException("Failed to generate token: " + e.getMessage(), e);
        }
    }
    
    // Overloaded method to include user ID and role in token
    public String generateToken(String subject, Long userId, String role, long ttlMinutes) {
        if (subject == null || subject.trim().isEmpty()) {
            throw new IllegalArgumentException("Subject cannot be null or empty");
        }
        if (ttlMinutes <= 0) {
            throw new IllegalArgumentException("TTL must be greater than 0");
        }

        try {
            Instant now = Instant.now();
            var builder = Jwts.builder()
                    .setSubject(subject)
                    .claim("email", subject)
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(now.plusSeconds(ttlMinutes * 60)));
            
            if (userId != null) {
                builder.claim("userId", userId);
            }
            
            if (role != null && !role.trim().isEmpty()) {
                builder.claim("authorities", java.util.List.of("ROLE_" + role));
                builder.claim("role", role);
            }
            
            return builder.signWith(key, SignatureAlgorithm.HS256).compact();
        } catch (Exception e) {
            log.error("Failed to generate JWT token", e);
            throw new JwtException("Failed to generate token: " + e.getMessage(), e);
        }
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        final Claims claims = parseToken(token);
        return resolver.apply(claims);
    }

    public String extractSubject(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public String extractUsername(String token) {
        return extractSubject(token);
    }

    public boolean isTokenValid(String token) {
        if (token == null || token.trim().isEmpty()) {
            log.debug("Token is null or empty");
            return false;
        }

        try {
            jwtParser.parseClaimsJws(token);
            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            log.debug("Token expiration check failed: {}", e.getMessage());
            return true; // If we can't parse the token, consider it expired
        }
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims parseToken(String token) {
        try {
            return jwtParser.parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException e) {
            log.info("Expired JWT token: {}", e.getMessage());
            throw new JwtException("Token has expired", e);
        } catch (UnsupportedJwtException e) {
            log.info("Unsupported JWT token: {}", e.getMessage());
            throw new JwtException("Token is not supported", e);
        } catch (MalformedJwtException e) {
            log.info("Invalid JWT token: {}", e.getMessage());
            throw new JwtException("Token is invalid", e);
        } catch (SignatureException e) {
            log.info("Invalid JWT signature: {}", e.getMessage());
            throw new JwtException("Token signature is invalid", e);
        } catch (IllegalArgumentException e) {
            log.info("JWT token compact of handler are invalid: {}", e.getMessage());
            throw new JwtException("Token is invalid or empty", e);
        } catch (Exception e) {
            log.error("Failed to parse JWT token: {}", e.getMessage());
            throw new JwtException("Failed to process token", e);
        }
    }

    private String ensureBase64(String maybe) {
        // If the provided secret doesn't look base64, base64-encode a padded version for dev convenience
        try {
            Decoders.BASE64.decode(maybe);
            return maybe; // already base64
        } catch (Exception e) {
            return java.util.Base64.getEncoder().encodeToString(maybe.getBytes());
        }
    }
}
