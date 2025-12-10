package com.expenseapp.group;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupDefaultsRepository extends JpaRepository<GroupDefaults, Long> {
    Optional<GroupDefaults> findByGroup(Group group);
}
