package com.expenseapp.company.web;

import com.expenseapp.company.domain.Company;
import com.expenseapp.company.service.CompanyService;
import com.expenseapp.company.web.dto.CompanyRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/companies")
@CrossOrigin
public class CompanyController {
    private final CompanyService service;

    public CompanyController(CompanyService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Company> create(@Valid @RequestBody CompanyRequest req, @RequestHeader(value = "X-User-Id", required = false) String userIdStr) {
        Long userId = null;
        if (userIdStr != null) {
            try {
                userId = Long.parseLong(userIdStr);
            } catch (NumberFormatException e) {
                // X-User-Id is not numeric (might be email), use null for now
            }
        }
        Company saved = service.create(req, userId);
        return ResponseEntity.created(URI.create("/api/v1/companies/" + saved.getId())).body(saved);
    }

    @GetMapping
    public List<Company> list(@RequestHeader(value = "X-User-Id", required = false) String userIdStr) {
        if (userIdStr != null) {
            try {
                Long userId = Long.parseLong(userIdStr);
                return service.findAllByUser(userId);
            } catch (NumberFormatException e) {
                // X-User-Id is not numeric (might be email), return all for now
                // TODO: Implement user lookup by email or JWT integration
            }
        }
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Company> get(@PathVariable Long id, @RequestHeader(value = "X-User-Id", required = false) String userIdStr) {
        if (userIdStr != null) {
            try {
                Long userId = Long.parseLong(userIdStr);
                return service.findOneByUser(id, userId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
            } catch (NumberFormatException e) {
                // Fallthrough to non-filtered query
            }
        }
        return service.findOne(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Company> update(@PathVariable Long id, @Valid @RequestBody CompanyRequest req, @RequestHeader(value = "X-User-Id", required = false) String userIdStr) {
        // Verify ownership before update
        if (userIdStr != null) {
            try {
                Long userId = Long.parseLong(userIdStr);
                if (service.findOneByUser(id, userId).isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
            } catch (NumberFormatException e) {
                // Allow update if X-User-Id is not numeric
            }
        }
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestHeader(value = "X-User-Id", required = false) String userIdStr) {
        // Verify ownership before delete
        if (userIdStr != null) {
            try {
                Long userId = Long.parseLong(userIdStr);
                if (service.findOneByUser(id, userId).isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
            } catch (NumberFormatException e) {
                // Allow delete if X-User-Id is not numeric
            }
        }
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
