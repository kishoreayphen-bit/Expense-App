package com.expenseapp.company;

import com.expenseapp.company.dto.CompanyMemberView;
import com.expenseapp.company.dto.InviteMemberRequest;
import com.expenseapp.company.dto.CompanyView;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/companies")
public class CompanyMemberController {
    
    private final CompanyMemberService memberService;
    
    public CompanyMemberController(CompanyMemberService memberService) {
        this.memberService = memberService;
    }
    
    @PostMapping("/{companyId}/members/invite")
    public ResponseEntity<CompanyMemberView> inviteMember(
            @PathVariable Long companyId,
            @Valid @RequestBody InviteMemberRequest request) {
        String email = currentEmail();
        return ResponseEntity.ok(memberService.inviteMember(email, companyId, request.getEmail(), request.getRole()));
    }
    
    @PostMapping("/{companyId}/members/accept")
    public ResponseEntity<CompanyMemberView> acceptInvitation(@PathVariable Long companyId) {
        String email = currentEmail();
        return ResponseEntity.ok(memberService.acceptInvitation(email, companyId));
    }
    
    @PostMapping("/{companyId}/members/decline")
    public ResponseEntity<Map<String, String>> declineInvitation(
            @PathVariable Long companyId,
            @RequestBody(required = false) Map<String, String> body) {
        String email = currentEmail();
        String reason = body != null ? body.get("reason") : null;
        memberService.declineInvitation(email, companyId, reason);
        return ResponseEntity.ok(Map.of("message", "Invitation declined"));
    }
    
    @DeleteMapping("/{companyId}/members/{memberId}")
    public ResponseEntity<Map<String, String>> removeMember(
            @PathVariable Long companyId,
            @PathVariable Long memberId) {
        String email = currentEmail();
        memberService.removeMember(email, companyId, memberId);
        return ResponseEntity.ok(Map.of("message", "Member removed successfully"));
    }
    
    @GetMapping("/{companyId}/members")
    public ResponseEntity<List<CompanyMemberView>> listMembers(@PathVariable Long companyId) {
        if (companyId == null || companyId <= 0) {
            throw new IllegalArgumentException("Invalid company ID: " + companyId);
        }
        String email = currentEmail();
        return ResponseEntity.ok(memberService.listMembers(email, companyId));
    }
    
    @GetMapping("/invitations/pending")
    public ResponseEntity<List<CompanyMemberView>> getPendingInvitations() {
        String email = currentEmail();
        return ResponseEntity.ok(memberService.listPendingInvitations(email));
    }
    
    @GetMapping("/my")
    public ResponseEntity<List<CompanyView>> getMyCompanies() {
        String email = currentEmail();
        return ResponseEntity.ok(memberService.listUserCompaniesView(email));
    }
    
    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
