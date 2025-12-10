package com.expenseapp.audit;

import org.springframework.stereotype.Service;

@Service
public class AccessLogService {
    private final AccessLogRepository repo;

    public AccessLogService(AccessLogRepository repo) {
        this.repo = repo;
    }

    public void log(Long actorId, String actorEmail, String action, String resourceType, Long resourceId, String outcome, String metadata) {
        AccessLog l = new AccessLog();
        l.setActorId(actorId);
        l.setActorEmail(actorEmail);
        l.setAction(action);
        l.setResourceType(resourceType);
        l.setResourceId(resourceId);
        l.setOutcome(outcome);
        l.setMetadata(metadata);
        repo.save(l);
    }
}
