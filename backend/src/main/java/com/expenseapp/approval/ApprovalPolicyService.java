package com.expenseapp.approval;

import com.expenseapp.expense.Expense;
import com.expenseapp.expense.ExpenseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ApprovalPolicyService {

    private final ApprovalPolicyRepository policyRepository;
    private final ExpenseRepository expenseRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ApprovalPolicyService(ApprovalPolicyRepository policyRepository,
                                 ExpenseRepository expenseRepository) {
        this.policyRepository = policyRepository;
        this.expenseRepository = expenseRepository;
    }

    @Transactional(readOnly = true)
    public ApprovalPolicy getDefaultPolicy() {
        ApprovalPolicy p = policyRepository.findByName("Default");
        if (p == null) {
            p = new ApprovalPolicy();
            p.setName("Default");
            p.setRulesJson("{\"thresholds\":[{\"amount\":1000,\"approverRole\":\"MANAGER\",\"slaHours\":48},{\"amount\":5000,\"approverRole\":\"FINANCE\",\"slaHours\":24}]} ");
            policyRepository.save(p);
        }
        return p;
    }

    @Transactional
    public ApprovalPolicy updateDefaultPolicy(String rulesJson) {
        ApprovalPolicy p = getDefaultPolicy();
        p.setRulesJson(rulesJson);
        return policyRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<StepPlan> previewStepsForExpense(Long expenseId) {
        Expense e = expenseRepository.findById(expenseId).orElseThrow();
        return planForAmount(e.getAmount());
    }

    @Transactional(readOnly = true)
    public List<StepPlan> planForAmount(BigDecimal amount) {
        ApprovalPolicy p = getDefaultPolicy();
        try {
            JsonNode root = objectMapper.readTree(p.getRulesJson());
            JsonNode thresholds = root.path("thresholds");
            List<StepPlan> plans = new ArrayList<>();
            if (thresholds.isArray()) {
                List<JsonNode> nodes = new ArrayList<>();
                thresholds.forEach(nodes::add);
                nodes.sort(Comparator.comparing(n -> n.path("amount").decimalValue()));
                for (JsonNode n : nodes) {
                    BigDecimal amt = n.path("amount").decimalValue();
                    String role = n.path("approverRole").asText("MANAGER");
                    int sla = n.path("slaHours").asInt(48);
                    if (amount.compareTo(amt) >= 0) {
                        plans.add(new StepPlan(role, sla));
                    }
                }
            }
            if (plans.isEmpty()) {
                plans.add(new StepPlan("MANAGER", 48));
            }
            return plans;
        } catch (Exception ex) {
            // Fallback simple policy
            List<StepPlan> plans = new ArrayList<>();
            if (amount.compareTo(BigDecimal.valueOf(5000)) > 0) {
                plans.add(new StepPlan("MANAGER", 48));
                plans.add(new StepPlan("FINANCE", 24));
            } else {
                plans.add(new StepPlan("MANAGER", 48));
            }
            return plans;
        }
    }

    public static class StepPlan {
        public final String role;
        public final int slaHours;
        public StepPlan(String role, int slaHours) {
            this.role = role;
            this.slaHours = slaHours;
        }
    }
}
