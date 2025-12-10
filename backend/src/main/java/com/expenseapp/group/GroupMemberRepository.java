package com.expenseapp.group;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    List<GroupMember> findAllByGroup(Group group);
    List<GroupMember> findAllByUser(User user);
    Optional<GroupMember> findByGroupAndUser(Group group, User user);
}
