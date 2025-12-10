package com.expenseapp.role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    
    Optional<RoleEntity> findByName(String name);
    
    List<RoleEntity> findAllByOrderByLevelAsc();
    
    List<RoleEntity> findByLevelGreaterThanEqual(Integer level);
    
    List<RoleEntity> findByLevelLessThanEqual(Integer level);
    
    List<RoleEntity> findBySystemRoleTrue();
    
    boolean existsByName(String name);
}
