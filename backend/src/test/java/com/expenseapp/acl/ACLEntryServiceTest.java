package com.expenseapp.acl;

import com.expenseapp.group.Group;
import com.expenseapp.group.GroupMember;
import com.expenseapp.group.GroupMemberRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ACLEntryServiceTest {

    @Test
    void hasAccess_userGrant_allows() {
        ACLEntryRepository repo = mock(ACLEntryRepository.class);
        UserRepository users = mock(UserRepository.class);
        GroupMemberRepository gm = mock(GroupMemberRepository.class);
        ACLEntryService svc = new ACLEntryService(repo, users, gm);

        long userId = 1L;
        when(users.findById(userId)).thenReturn(Optional.of(new User()));
        ACLEntry grant = new ACLEntry();
        grant.setPrincipalType("USER");
        grant.setPrincipalId(userId);
        grant.setPermission("READ");
        when(repo.findAllByResourceTypeAndResourceId("EXPENSE", 100L))
                .thenReturn(List.of(grant));

        assertTrue(svc.hasAccess(userId, "EXPENSE", 100L, "READ"));
        assertFalse(svc.hasAccess(userId, "EXPENSE", 100L, "WRITE"));
    }

    @Test
    void hasAccess_groupGrant_allows() {
        ACLEntryRepository repo = mock(ACLEntryRepository.class);
        UserRepository users = mock(UserRepository.class);
        GroupMemberRepository gm = mock(GroupMemberRepository.class);
        ACLEntryService svc = new ACLEntryService(repo, users, gm);

        long userId = 2L;
        User u = new User();
        when(users.findById(userId)).thenReturn(Optional.of(u));
        Group g = mock(Group.class);
        when(g.getId()).thenReturn(77L);
        GroupMember m = new GroupMember();
        m.setGroup(g);
        when(gm.findAllByUser(u)).thenReturn(List.of(m));

        ACLEntry grant = new ACLEntry();
        grant.setPrincipalType("GROUP");
        grant.setPrincipalId(77L);
        grant.setPermission("READ");
        when(repo.findAllByResourceTypeAndResourceId("RECEIPT", 200L))
                .thenReturn(List.of(grant));

        assertTrue(svc.hasAccess(userId, "RECEIPT", 200L, "READ"));
    }

    @Test
    void writeImpliesRead() {
        ACLEntryRepository repo = mock(ACLEntryRepository.class);
        UserRepository users = mock(UserRepository.class);
        GroupMemberRepository gm = mock(GroupMemberRepository.class);
        ACLEntryService svc = new ACLEntryService(repo, users, gm);

        long userId = 3L;
        when(users.findById(userId)).thenReturn(Optional.of(new User()));
        ACLEntry grant = new ACLEntry();
        grant.setPrincipalType("USER");
        grant.setPrincipalId(userId);
        grant.setPermission("WRITE");
        when(repo.findAllByResourceTypeAndResourceId("EXPENSE", 300L))
                .thenReturn(List.of(grant));

        assertTrue(svc.hasAccess(userId, "EXPENSE", 300L, "READ"));
        assertTrue(svc.hasAccess(userId, "EXPENSE", 300L, "WRITE"));
    }
}
