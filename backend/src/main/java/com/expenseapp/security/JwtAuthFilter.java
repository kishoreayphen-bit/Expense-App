package com.expenseapp.security;

import com.expenseapp.user.UserRepository;
import io.jsonwebtoken.*;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private static final List<String> PUBLIC_ENDPOINTS = List.of(
        "/actuator/health",
        "/api/v1/health",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/signup",
        "/api/v1/auth/refresh",
        "/error",
        "/api/test/**",
        "/v3/api-docs",
        "/v3/api-docs/**",
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/webjars/**"
    );

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtTokenProvider tokenProvider, UserRepository userRepository) {
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestUri = request.getRequestURI();
        String method = request.getMethod();
        
        // Skip JWT check for public endpoints
        if (isPublicEndpoint(requestUri)) {
            log.debug("Skipping JWT check for public endpoint: {} {}", method, requestUri);
            filterChain.doFilter(request, response);
            return;
        }
        
        log.debug("Processing authentication for request: {} {}", method, requestUri);
        
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("No Bearer token found in Authorization header for {} {}", method, requestUri);
            sendUnauthorized(response, "Missing or invalid Authorization header");
            return;
        }
        
        String token = authHeader.substring(7);
        if (token.isBlank()) {
            log.warn("Empty JWT token provided for {} {}", method, requestUri);
            sendUnauthorized(response, "JWT token cannot be empty");
            return;
        }
        
        try {
            log.debug("Validating JWT token for {} {}", method, requestUri);
            
            // Validate token using JwtTokenProvider
            if (!tokenProvider.validateToken(token)) {
                log.warn("Invalid JWT token for {} {}", method, requestUri);
                sendUnauthorized(response, "Invalid or expired token");
                return;
            }
            
            // Extract username from token
            String username = tokenProvider.getUsernameFromJWT(token);
            if (username == null || username.trim().isEmpty()) {
                log.warn("No username found in JWT token for {} {}", method, requestUri);
                sendUnauthorized(response, "Invalid token: No username found");
                return;
            }
            
            log.debug("Loading user details for: {}", username);
            UserDetails userDetails = userRepository.findByEmail(username)
                .orElse(null);
                
            if (userDetails == null) {
                log.warn("No user found for username: {}", username);
                sendUnauthorized(response, "User not found");
                return;
            }
            
            if (!userDetails.isEnabled()) {
                log.warn("User account is disabled: {}", username);
                sendUnauthorized(response, "User account is disabled");
                return;
            }
            
            log.debug("Creating authentication for user: {}", username);
            // Set up Spring Security context
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            log.debug("Successfully authenticated user: {}", username);
            filterChain.doFilter(request, response);
            
        } catch (ExpiredJwtException e) {
            log.warn("Expired JWT token for {} {}: {}", method, requestUri, e.getMessage());
            sendUnauthorized(response, "Token has expired");
        } catch (JwtException e) {
            log.warn("JWT validation failed for {} {}: {}", method, requestUri, e.getMessage());
            sendUnauthorized(response, "Invalid token: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during authentication for {} {}: {}", 
                method, requestUri, e.getMessage(), e);
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }
    
    private boolean isPublicEndpoint(String requestUri) {
        org.springframework.util.AntPathMatcher pathMatcher = new org.springframework.util.AntPathMatcher();
        return PUBLIC_ENDPOINTS.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestUri));
    }
    
    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        sendError(response, HttpServletResponse.SC_UNAUTHORIZED, message);
    }
    
    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
            String.format("{\"status\":\"error\",\"message\":\"%s\"}", message)
        );
        response.getWriter().flush();
    }
}
