package com.expenseapp.acl;

import com.expenseapp.group.GroupMember;
import com.expenseapp.group.GroupMemberRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ACLEntryService {
    private final ACLEntryRepository aclEntryRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    public ACLEntryService(ACLEntryRepository aclEntryRepository, UserRepository userRepository, GroupMemberRepository groupMemberRepository) {
        this.aclEntryRepository = aclEntryRepository;
        this.userRepository = userRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    @Transactional
    public ACLEntry share(String actorEmail, String resourceType, Long resourceId,
                          String principalType, Long principalId, String permission) {
        User actor = userRepository.findByEmail(actorEmail).orElseThrow();
        ACLEntry e = aclEntryRepository
                .findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalIdAndPermission(resourceType, resourceId, principalType, principalId, permission)
                .orElseGet(ACLEntry::new);
        e.setResourceType(resourceType);
        e.setResourceId(resourceId);
        e.setPrincipalType(principalType);
        e.setPrincipalId(principalId);
        e.setPermission(permission);
        e.setCreatedBy(actor.getId());
        return aclEntryRepository.save(e);
    }

    @Transactional
    public void revoke(String resourceType, Long resourceId, String principalType, Long principalId, String permission) {
        aclEntryRepository
                .findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalIdAndPermission(resourceType, resourceId, principalType, principalId, permission)
                .ifPresent(aclEntryRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<ACLEntry> list(String resourceType, Long resourceId) {
        return aclEntryRepository.findAllByResourceTypeAndResourceId(resourceType, resourceId);
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(Long userId, String resourceType, Long resourceId, String neededPermission) {
        // If any matching USER grant exists with neededPermission or WRITE implied for READ, allow
        List<ACLEntry> grants = aclEntryRepository.findAllByResourceTypeAndResourceId(resourceType, resourceId);
        for (ACLEntry g : grants) {
            if ("USER".equalsIgnoreCase(g.getPrincipalType()) && g.getPrincipalId().equals(userId)) {
                if (permAllows(g.getPermission(), neededPermission)) return true;
            }
        }
        // Check group membership and GROUP grants
        User u = userRepository.findById(userId).orElse(null);
        if (u == null) return false;
        List<GroupMember> memberships = groupMemberRepository.findAllByUser(u);
        java.util.Set<Long> groupIds = new java.util.HashSet<>();
        for (GroupMember m : memberships) groupIds.add(m.getGroup().getId());
        for (ACLEntry g : grants) {
            if ("GROUP".equalsIgnoreCase(g.getPrincipalType()) && groupIds.contains(g.getPrincipalId())) {
                if (permAllows(g.getPermission(), neededPermission)) return true;
            }
        }
        return false;
    }

    private boolean permAllows(String grant, String needed) {
        if (grant == null || needed == null) return false;
        grant = grant.toUpperCase();
        needed = needed.toUpperCase();
        if (grant.equals(needed)) return true;
        // WRITE implies READ
        return grant.equals("WRITE") && needed.equals("READ");
    }
}
