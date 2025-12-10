package com.expenseapp.company;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CompanyService {
    
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository memberRepository;
    private final UserRepository userRepository;
    
    public CompanyService(
            CompanyRepository companyRepository,
            CompanyMemberRepository memberRepository,
            UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }
    
    /**
     * List all companies where user is an ACTIVE member
     * SUPER_ADMIN and ADMIN can see all companies
     */
    @Transactional(readOnly = true)
    public List<Company> listUserCompanies(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        
        // SUPER_ADMIN and ADMIN can see all companies
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN || 
            user.getRole() == com.expenseapp.user.Role.ADMIN) {
            return companyRepository.findAll();
        }
        
        return memberRepository.findActiveByUser(user).stream()
            .map(CompanyMember::getCompany)
            .collect(Collectors.toList());
    }
    
    /**
     * Get company by ID (user must be a member)
     * SUPER_ADMIN and ADMIN can access any company
     */
    @Transactional(readOnly = true)
    public Company getCompany(String userEmail, Long companyId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        // SUPER_ADMIN and ADMIN can access any company
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN || 
            user.getRole() == com.expenseapp.user.Role.ADMIN) {
            return company;
        }
        
        // Verify user is a member
        if (!memberRepository.existsByCompanyAndUser(company, user)) {
            throw new IllegalArgumentException("You are not a member of this company");
        }
        
        return company;
    }
    
    /**
     * Create a new company (user becomes OWNER)
     */
    @Transactional
    public Company createCompany(String userEmail, Company company) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        
        // Check for duplicate company code
        if (companyRepository.existsByCompanyCode(company.getCompanyCode())) {
            throw new IllegalArgumentException("Company code '" + company.getCompanyCode() + "' already exists. Please use a different code.");
        }
        
        // Check for duplicate company name
        if (companyRepository.existsByCompanyName(company.getCompanyName())) {
            throw new IllegalArgumentException("Company name '" + company.getCompanyName() + "' already exists. Please use a different name.");
        }
        
        // Set timestamps
        company.setCreatedAt(Instant.now());
        company.setUpdatedAt(Instant.now());
        company.setCreatedBy(user.getId());
        
        // Save company
        Company savedCompany = companyRepository.save(company);
        
        // Add user as OWNER
        CompanyMember ownerMember = new CompanyMember();
        ownerMember.setCompany(savedCompany);
        ownerMember.setUser(user);
        ownerMember.setRole("OWNER");
        ownerMember.setStatus("ACTIVE");
        ownerMember.setJoinedAt(Instant.now());
        ownerMember.setCreatedAt(Instant.now());
        ownerMember.setUpdatedAt(Instant.now());
        memberRepository.save(ownerMember);
        
        return savedCompany;
    }
    
    /**
     * Update company (DISABLED - No role can update companies)
     */
    @Transactional
    public Company updateCompany(String userEmail, Long companyId, Company updatedCompany) {
        // Company updates are disabled for all roles
        throw new IllegalArgumentException("Company updates are not allowed");
    }
    
    /**
     * Delete company (DISABLED - No role can delete companies)
     */
    @Transactional
    public void deleteCompany(String userEmail, Long companyId) {
        // Company deletion is disabled for all roles
        throw new IllegalArgumentException("Company deletion is not allowed");
    }
}
