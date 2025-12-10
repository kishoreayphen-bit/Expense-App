package com.expenseapp.company.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@Entity
@Table(name = "companies", uniqueConstraints = {
        @UniqueConstraint(name = "uk_company_name", columnNames = {"company_name"}),
        @UniqueConstraint(name = "uk_company_code", columnNames = {"company_code"})
})
@EntityListeners(AuditingEntityListener.class)
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "company_code", nullable = false, length = 50)
    private String companyCode;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(name = "industry_type", length = 50)
    private String industryType;

    @Column(name = "company_email", nullable = false, length = 120)
    private String companyEmail;

    @Column(name = "contact_number", nullable = false, length = 20)
    private String contactNumber;

    @Column(name = "website", length = 200)
    private String website;

    @Column(name = "address_line1", nullable = false, length = 200)
    private String addressLine1;

    @Column(name = "address_line2", length = 200)
    private String addressLine2;

    @Column(name = "city", nullable = false, length = 80)
    private String city;

    @Column(name = "state", nullable = false, length = 80)
    private String state;

    @Column(name = "country", nullable = false, length = 80)
    private String country;

    @Column(name = "postal_code", nullable = false, length = 15)
    private String postalCode;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "fiscal_year_start")
    private String fiscalYearStart; // ISO date MM-DD or YYYY-MM-DD optional

    @Column(name = "time_zone", nullable = false, length = 60)
    private String timeZone;

    @Column(name = "company_logo_url", length = 300)
    private String companyLogoUrl;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // ACTIVE / INACTIVE

    @Column(name = "created_by")
    private Long createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
