package com.expenseapp.company;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyMemberRepository extends JpaRepository<CompanyMember, Long> {
    
    List<CompanyMember> findAllByCompany(Company company);
    
    List<CompanyMember> findAllByUser(User user);
    
    List<CompanyMember> findAllByUserAndStatus(User user, String status);
    
    Optional<CompanyMember> findByCompanyAndUser(Company company, User user);
    
    @Query("SELECT cm FROM CompanyMember cm WHERE cm.user = :user AND cm.status = 'ACTIVE'")
    List<CompanyMember> findActiveByUser(@Param("user") User user);
    
    @Query("SELECT cm FROM CompanyMember cm WHERE cm.company = :company AND cm.status = 'ACTIVE'")
    List<CompanyMember> findActiveByCompany(@Param("company") Company company);
    
    @Query("SELECT cm FROM CompanyMember cm WHERE cm.company = :company AND cm.status = 'INVITED'")
    List<CompanyMember> findInvitedByCompany(@Param("company") Company company);
    
    boolean existsByCompanyAndUser(Company company, User user);
    
    @Query("SELECT cm FROM CompanyMember cm WHERE cm.company.id = :companyId AND cm.user.id = :userId")
    Optional<CompanyMember> findByCompanyIdAndUserId(@Param("companyId") Long companyId, @Param("userId") Long userId);
    
    long countByCompany(Company company);
}
