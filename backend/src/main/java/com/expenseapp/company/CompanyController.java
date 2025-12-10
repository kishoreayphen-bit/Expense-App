package com.expenseapp.company;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/companies")
public class CompanyController {
    
    private final CompanyService companyService;
    
    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }
    
    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "";
    }
    
    /**
     * List all companies where user is an ACTIVE member
     */
    @GetMapping
    public ResponseEntity<List<Company>> listMyCompanies() {
        String email = currentEmail();
        return ResponseEntity.ok(companyService.listUserCompanies(email));
    }
    
    /**
     * Get company by ID (user must be a member)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Company> getCompany(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(companyService.getCompany(email, id));
    }
    
    /**
     * Create a new company (user becomes OWNER)
     */
    @PostMapping
    public ResponseEntity<Company> createCompany(@RequestBody Company company) {
        String email = currentEmail();
        return ResponseEntity.ok(companyService.createCompany(email, company));
    }
    
    /**
     * Update company (OWNER only)
     */
    @PutMapping("/{id}")
    public ResponseEntity<Company> updateCompany(
            @PathVariable Long id,
            @RequestBody Company company) {
        String email = currentEmail();
        return ResponseEntity.ok(companyService.updateCompany(email, id, company));
    }
    
    /**
     * Delete company (OWNER only)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        String email = currentEmail();
        companyService.deleteCompany(email, id);
        return ResponseEntity.ok().build();
    }
}
