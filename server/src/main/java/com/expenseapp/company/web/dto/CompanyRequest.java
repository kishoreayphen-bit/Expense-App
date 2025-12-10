package com.expenseapp.company.web.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CompanyRequest {
    @NotBlank
    @Size(min = 3, max = 100)
    private String companyName;

    @NotBlank
    @Size(min = 2, max = 50)
    private String companyCode;

    private String registrationNumber; // optional

    private String taxId; // optional (GSTIN etc.)

    @NotBlank
    private String industryType;

    @NotBlank
    @Email
    private String companyEmail;

    @NotBlank
    @Pattern(regexp = "^[0-9]{10,15}$", message = "contactNumber must be 10-15 digits")
    private String contactNumber;

    private String website; // optional URL validation on client

    @NotBlank
    private String addressLine1;

    private String addressLine2;

    @NotBlank
    private String city;

    @NotBlank
    private String state;

    @NotBlank
    private String country;

    @NotBlank
    @Pattern(regexp = "^[0-9]{3,10}$", message = "postalCode must be numeric")
    private String postalCode;

    @NotBlank
    private String currency;

    private String fiscalYearStart; // optional

    @NotBlank
    private String timeZone;

    private String companyLogoUrl; // optional, client uploads elsewhere

    private String status = "ACTIVE"; // default
}
