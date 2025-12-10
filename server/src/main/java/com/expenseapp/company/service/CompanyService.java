package com.expenseapp.company.service;

import com.expenseapp.company.domain.Company;
import com.expenseapp.company.repository.CompanyRepository;
import com.expenseapp.company.web.dto.CompanyRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CompanyService {
    private final CompanyRepository repo;

    public CompanyService(CompanyRepository repo) {
        this.repo = repo;
    }

    public Company create(CompanyRequest req, Long userId) {
        if (repo.existsByCompanyNameIgnoreCase(req.getCompanyName())) {
            throw new IllegalArgumentException("companyName already exists");
        }
        if (repo.existsByCompanyCodeIgnoreCase(req.getCompanyCode())) {
            throw new IllegalArgumentException("companyCode already exists");
        }
        Company c = Company.builder()
                .companyName(req.getCompanyName().trim())
                .companyCode(req.getCompanyCode().trim())
                .registrationNumber(req.getRegistrationNumber())
                .taxId(req.getTaxId())
                .industryType(req.getIndustryType())
                .companyEmail(req.getCompanyEmail().toLowerCase())
                .contactNumber(req.getContactNumber())
                .website(req.getWebsite())
                .addressLine1(req.getAddressLine1())
                .addressLine2(req.getAddressLine2())
                .city(req.getCity())
                .state(req.getState())
                .country(req.getCountry())
                .postalCode(req.getPostalCode())
                .currency(req.getCurrency())
                .fiscalYearStart(req.getFiscalYearStart())
                .timeZone(req.getTimeZone())
                .companyLogoUrl(req.getCompanyLogoUrl())
                .status(req.getStatus() == null ? "ACTIVE" : req.getStatus())
                .createdBy(userId)
                .build();
        return repo.save(c);
    }

    @Transactional(readOnly = true)
    public List<Company> findAll() {
        return repo.findAll();
    }
    
    @Transactional(readOnly = true)
    public List<Company> findAllByUser(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return repo.findByCreatedByAndStatusNot(userId, "DELETED");
    }

    @Transactional(readOnly = true)
    public Optional<Company> findOne(Long id) {
        return repo.findByIdAndStatusNot(id, "DELETED");
    }
    
    @Transactional(readOnly = true)
    public Optional<Company> findOneByUser(Long id, Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return repo.findByIdAndCreatedByAndStatusNot(id, userId, "DELETED");
    }

    public Company update(Long id, CompanyRequest req) {
        Company c = findOne(id).orElseThrow(() -> new IllegalArgumentException("Company not found"));
        // Only update mutable fields
        c.setCompanyName(req.getCompanyName());
        c.setCompanyCode(req.getCompanyCode());
        c.setRegistrationNumber(req.getRegistrationNumber());
        c.setTaxId(req.getTaxId());
        c.setIndustryType(req.getIndustryType());
        c.setCompanyEmail(req.getCompanyEmail());
        c.setContactNumber(req.getContactNumber());
        c.setWebsite(req.getWebsite());
        c.setAddressLine1(req.getAddressLine1());
        c.setAddressLine2(req.getAddressLine2());
        c.setCity(req.getCity());
        c.setState(req.getState());
        c.setCountry(req.getCountry());
        c.setPostalCode(req.getPostalCode());
        c.setCurrency(req.getCurrency());
        c.setFiscalYearStart(req.getFiscalYearStart());
        c.setTimeZone(req.getTimeZone());
        c.setCompanyLogoUrl(req.getCompanyLogoUrl());
        c.setStatus(req.getStatus() == null ? c.getStatus() : req.getStatus());
        return repo.save(c);
    }

    public void deactivate(Long id) {
        Company c = findOne(id).orElseThrow(() -> new IllegalArgumentException("Company not found"));
        c.setStatus("INACTIVE");
        repo.save(c);
    }
}
