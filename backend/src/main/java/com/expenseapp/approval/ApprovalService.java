package com.expenseapp.approval;

import com.expenseapp.expense.Expense;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.notification.NotificationPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final ApprovalAuditRepository auditRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final ApprovalStepRepository stepRepository;
    private final ApprovalPolicyService policyService;

    public ApprovalService(ApprovalRepository approvalRepository,
                           ApprovalAuditRepository auditRepository,
                           ExpenseRepository expenseRepository,
                           UserRepository userRepository,
                           NotificationPublisher notificationPublisher,
                           ApprovalStepRepository stepRepository,
                           ApprovalPolicyService policyService) {
        this.approvalRepository = approvalRepository;
        this.auditRepository = auditRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.notificationPublisher = notificationPublisher;
        this.stepRepository = stepRepository;
        this.policyService = policyService;
    }

    @Transactional
    public Approval submit(String requesterEmail, Long expenseId, Long approverId, Long companyId) {
        User requester = userRepository.findByEmail(requesterEmail).orElseThrow();
        Expense expense = expenseRepository.findById(expenseId).orElseThrow();
        // Verify company context matches
        if (companyId == null && expense.getCompanyId() != null) {
            throw new IllegalArgumentException("Cannot submit company expense in personal mode");
        }
        if (companyId != null && !companyId.equals(expense.getCompanyId())) {
            throw new IllegalArgumentException("Expense belongs to different company");
        }
        if (!expense.getUser().getId().equals(requester.getId())) {
            throw new IllegalArgumentException("Cannot submit others' expense");
        }
        // prevent duplicate submission
        Approval existing = approvalRepository.findByExpense(expense);
        if (existing != null) return existing;

        Approval a = new Approval();
        a.setExpense(expense);
        a.setRequester(requester);
        // simple policy engine stub: if approverId provided, use it; else self-approve if amount <= 1000
        if (approverId != null) {
            User approver = userRepository.findById(approverId).orElseThrow();
            a.setApprover(approver);
        }
        a.setStatus("PENDING");
        // Derive steps from policy and compute overall SLA as max of step SLAs
        java.time.Instant now = java.time.Instant.now();
        a = approvalRepository.save(a);

        expense.setApprovalStatus("PENDING");
        expense.setSubmittedAt(now);

        // Generate approval steps from policy
        var plans = policyService.planForAmount(expense.getAmount());
        int order = 1;
        java.time.Instant overallSla = null;
        for (var plan : plans) {
            ApprovalStep step = new ApprovalStep();
            step.setApproval(a);
            step.setStepOrder(order++);
            step.setRole(plan.role);
            java.time.Instant stepDue = now.plus(java.time.Duration.ofHours(plan.slaHours));
            step.setSlaDueAt(stepDue);
            stepRepository.save(step);
            if (overallSla == null || stepDue.isAfter(overallSla)) overallSla = stepDue;
        }
        a.setSlaDueAt(overallSla);

        recordAudit(a, requester, "SUBMITTED", null);
        // Notify approver if assigned, else requester gets info
        if (a.getApprover() != null) {
            notificationPublisher.publish(a.getApprover().getId(), "APPROVAL_SUBMIT",
                    "Approval Requested", "An expense was submitted for your approval.",
                    "{\"expenseId\":" + expense.getId() + "}");
        } else {
            notificationPublisher.publish(requester.getId(), "APPROVAL_SUBMIT",
                    "Approval Submitted", "Your expense was submitted for approval.",
                    "{\"expenseId\":" + expense.getId() + "}");
        }
        return a;
    }

    @Transactional
    public Approval approve(String approverEmail, Long approvalId, String notes, Long companyId) {
        User approver = userRepository.findByEmail(approverEmail).orElseThrow();
        Approval a = approvalRepository.findById(approvalId).orElseThrow();
        // Verify company context matches
        Expense expense = a.getExpense();
        if (companyId == null && expense.getCompanyId() != null) {
            throw new IllegalArgumentException("Cannot approve company expense in personal mode");
        }
        if (companyId != null && !companyId.equals(expense.getCompanyId())) {
            throw new IllegalArgumentException("Expense belongs to different company");
        }
        // operate on current pending step
        ApprovalStep current = null;
        {
            var list = stepRepository.findPendingStepsOrdered(a);
            if (!list.isEmpty()) current = list.get(0);
        }
        if (current == null) {
            // If no steps, fallback to single-step behavior
            a.setApprover(a.getApprover() == null ? approver : a.getApprover());
            a.setStatus("APPROVED");
            a.setUpdatedAt(Instant.now());
            Expense e = a.getExpense();
            e.setApprovalStatus("APPROVED");
            e.setApprovedAt(Instant.now());
            recordAudit(a, approver, "APPROVED", notes);
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_DECISION",
                    "Expense Approved", "Your expense was approved.",
                    "{\"expenseId\":" + e.getId() + "}");
            return a;
        }
        current.setApprover(approver);
        current.setStatus("APPROVED");
        current.setDecidedAt(Instant.now());
        stepRepository.save(current);
        recordAudit(a, approver, "APPROVED", notes);
        // If all steps approved, finalize
        boolean anyPending = stepRepository.findByApprovalOrderByStepOrder(a).stream().anyMatch(s -> "PENDING".equals(s.getStatus()));
        if (!anyPending) {
            a.setStatus("APPROVED");
            a.setUpdatedAt(Instant.now());
            Expense e = a.getExpense();
            e.setApprovalStatus("APPROVED");
            e.setApprovedAt(Instant.now());
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_DECISION",
                    "Expense Approved", "Your expense was approved.",
                    "{\"expenseId\":" + e.getId() + "}");
        } else {
            // Notify next step assignee by role (placeholder to requester)
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_PROGRESS",
                    "Approval Advanced", "Your approval moved to the next step.",
                    "{\"approvalId\":" + a.getId() + "}");
        }
        return a;
    }

    @Transactional
    public Approval reject(String approverEmail, Long approvalId, String notes, Long companyId) {
        User approver = userRepository.findByEmail(approverEmail).orElseThrow();
        Approval a = approvalRepository.findById(approvalId).orElseThrow();
        // Verify company context matches
        Expense expense = a.getExpense();
        if (companyId == null && expense.getCompanyId() != null) {
            throw new IllegalArgumentException("Cannot reject company expense in personal mode");
        }
        if (companyId != null && !companyId.equals(expense.getCompanyId())) {
            throw new IllegalArgumentException("Expense belongs to different company");
        }
        ApprovalStep current = null;
        {
            var list = stepRepository.findPendingStepsOrdered(a);
            if (!list.isEmpty()) current = list.get(0);
        }
        if (current == null) {
            a.setApprover(a.getApprover() == null ? approver : a.getApprover());
            a.setStatus("REJECTED");
            a.setUpdatedAt(Instant.now());
            Expense e = a.getExpense();
            e.setApprovalStatus("REJECTED");
            recordAudit(a, approver, "REJECTED", notes);
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_DECISION",
                    "Expense Rejected", "Your expense was rejected.",
                    "{\"expenseId\":" + e.getId() + "}");
            return a;
        }
        current.setApprover(approver);
        current.setStatus("REJECTED");
        current.setDecidedAt(Instant.now());
        stepRepository.save(current);
        a.setStatus("REJECTED");
        a.setUpdatedAt(Instant.now());
        Expense e = a.getExpense();
        e.setApprovalStatus("REJECTED");
        recordAudit(a, approver, "REJECTED", notes);
        notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_DECISION",
                "Expense Rejected", "Your expense was rejected.",
                "{\"expenseId\":" + e.getId() + "}");
        return a;
    }

    @Transactional(readOnly = true)
    public List<Approval> myRequests(String email) {
        User u = userRepository.findByEmail(email).orElseThrow();
        return approvalRepository.findAllByRequester(u);
    }

    @Transactional(readOnly = true)
    public List<Approval> toApprove(String email) {
        User u = userRepository.findByEmail(email).orElseThrow();
        return approvalRepository.findAllByApprover(u);
    }

    @Transactional
    public int escalatePendingPastSla() {
        var list = approvalRepository.findPendingPastSla();
        for (Approval a : list) {
            // Audit escalation
            recordAudit(a, a.getRequester(), "ESCALATED", "SLA breached");
            // Notify approver and requester
            if (a.getApprover() != null) {
                notificationPublisher.publish(a.getApprover().getId(), "APPROVAL_ESCALATION",
                        "Approval SLA Breached", "An approval request breached SLA.",
                        "{\"approvalId\":" + a.getId() + "}");
            }
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_ESCALATION",
                    "Approval SLA Breached", "Your approval request breached SLA.",
                    "{\"approvalId\":" + a.getId() + "}");
        }
        return list.size();
    }

    @Transactional
    public int escalatePendingStepsPastSla() {
        var steps = stepRepository.findPendingPastSla();
        for (ApprovalStep s : steps) {
            Approval a = s.getApproval();
            recordAudit(a, a.getRequester(), "ESCALATED", "Step SLA breached");
            if (s.getApprover() != null) {
                notificationPublisher.publish(s.getApprover().getId(), "APPROVAL_STEP_ESCALATION",
                        "Approval Step SLA Breached", "A step breached its SLA.",
                        "{\"approvalId\":" + a.getId() + ",\"stepId\":" + s.getId() + "}");
            }
            notificationPublisher.publish(a.getRequester().getId(), "APPROVAL_STEP_ESCALATION",
                    "Approval Step SLA Breached", "Your approval step breached SLA.",
                    "{\"approvalId\":" + a.getId() + ",\"stepId\":" + s.getId() + "}");
        }
        return steps.size();
    }

    private void recordAudit(Approval a, User actor, String action, String notes) {
        ApprovalAudit audit = new ApprovalAudit();
        audit.setApproval(a);
        audit.setActor(actor);
        audit.setAction(action);
        audit.setNotes(notes);
        auditRepository.save(audit);
    }
}
