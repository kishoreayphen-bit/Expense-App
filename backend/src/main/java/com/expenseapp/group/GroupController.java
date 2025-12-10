package com.expenseapp.group;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// NOTE: Disabled controller to avoid mapping conflicts with GroupsController.
// This placeholder remains to retain history but is not registered as a Spring bean.
public class GroupController {

    private final NamedParameterJdbcTemplate jdbc;

    public GroupController(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // NOTE: All CRUD and member management endpoints are intentionally removed here
    // to avoid collisions with existing GroupsController. This controller only serves
    // a lightweight users directory under the groups namespace.

    // Lightweight users directory made available under groups namespace for convenience
    public static class UserDirectoryView {
        public Long id;
        public String name;
        public String email;
    }

    // Directory endpoint intentionally removed; use UsersController (/api/v1/users)

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
