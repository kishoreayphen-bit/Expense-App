package com.expenseapp.budget;

import com.expenseapp.budget.dto.BudgetCreateRequest;
import com.expenseapp.budget.dto.BudgetUpdateRequest;
import com.expenseapp.budget.dto.BudgetView;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.expense.CategoryRepository;
import com.expenseapp.expense.Category;
import com.expenseapp.group.Group;
import com.expenseapp.group.GroupRepository;
import com.expenseapp.notification.NotificationPublisher;
import com.expenseapp.notification.NotificationRepository;
import com.expenseapp.fx.FXService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationPublisher notificationPublisher;
    private final NotificationRepository notificationRepository;
    private final CategoryRepository categoryRepository;
    private final FXService fxService;
    private final BudgetPermissionService budgetPermissionService;

    public BudgetService(BudgetRepository budgetRepository,
                         UserRepository userRepository,
                         GroupRepository groupRepository,
                         ExpenseRepository expenseRepository,
                         NotificationPublisher notificationPublisher,
                         NotificationRepository notificationRepository,
                         CategoryRepository categoryRepository,
                         FXService fxService,
                         BudgetPermissionService budgetPermissionService) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.expenseRepository = expenseRepository;
        this.notificationPublisher = notificationPublisher;
        this.notificationRepository = notificationRepository;
        this.categoryRepository = categoryRepository;
        this.fxService = fxService;
        this.budgetPermissionService = budgetPermissionService;
    }

    @Transactional
    public Budget createEntity(String userEmail, BudgetCreateRequest req) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        
        // STRICT ISOLATION: Set companyId for proper scoping
        Long resolvedCompanyId = (req.getCompanyId() != null && req.getCompanyId() > 0) ? req.getCompanyId() : null;
        
        // Check permission for company budgets
        if (resolvedCompanyId != null) {
            if (!budgetPermissionService.canCreateBudgets(user, resolvedCompanyId)) {
                throw new IllegalArgumentException("You do not have permission to create budgets in this company");
            }
        }
        
        Budget budget = new Budget();
        budget.setUser(user);
        budget.setCompanyId(resolvedCompanyId);
        if (req.getGroupId() != null) {
            Group group = groupRepository.findById(req.getGroupId()).orElseThrow();
            budget.setGroup(group);
        }
        if (req.getCategoryId() != null) {
            Category cat = categoryRepository.findById(req.getCategoryId()).orElseThrow();
            budget.setCategory(cat);
        }
        budget.setPeriod(req.getPeriod());
        budget.setAmount(req.getAmount());
        budget.setAlert80(req.isAlert80());
        budget.setAlert100(req.isAlert100());
        return budgetRepository.save(budget);
    }

    @Transactional
    public BudgetView create(String userEmail, BudgetCreateRequest req) {
        Budget saved = createEntity(userEmail, req);
        return toView(saved);
    }

    @Transactional
    public BudgetView update(String userEmail, Long id, BudgetUpdateRequest req) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        // SUPER_ADMIN and ADMIN can update any budget
        if (user.getRole() != com.expenseapp.user.Role.SUPER_ADMIN && 
            user.getRole() != com.expenseapp.user.Role.ADMIN) {
            // Personal budget: ensure ownership
            if (budget.getUser() != null) {
                if (!budget.getUser().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Cannot update others' budget");
                }
            } // Group budgets may have null user; we could validate membership here if needed
        }
        budget.setAmount(req.getAmount());
        budget.setAlert80(req.isAlert80());
        budget.setAlert100(req.isAlert100());
        Budget saved = budgetRepository.save(budget);
        return toView(saved);
    }

    @Transactional
    public void delete(String userEmail, Long id) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Budget budget = budgetRepository.findById(id).orElseThrow();
        
        // SUPER_ADMIN and ADMIN can delete any budget
        if (user.getRole() != com.expenseapp.user.Role.SUPER_ADMIN && 
            user.getRole() != com.expenseapp.user.Role.ADMIN) {
            if (!budget.getUser().getId().equals(user.getId())) {
                throw new IllegalArgumentException("Cannot delete others' budget");
            }
        }
        budgetRepository.delete(budget);
    }

    @Transactional(readOnly = true)
    public List<BudgetView> list(String userEmail, String period) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        List<Budget> budgets = budgetRepository.findAllByUserAndPeriod(user, period);
        List<BudgetView> views = new ArrayList<>();
        
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        
        for (Budget budget : budgets) {
            BudgetView view = new BudgetView();
            view.setId(budget.getId());
            view.setUserId(budget.getUser().getId());
            view.setGroupId(budget.getGroup() != null ? budget.getGroup().getId() : null);
            view.setCategoryId(budget.getCategory() != null ? budget.getCategory().getId() : null);
            view.setCategoryName(budget.getCategory() != null ? budget.getCategory().getName() : "All Categories");
            view.setPeriod(budget.getPeriod());
            view.setAmount(budget.getAmount());
            view.setAlert80(budget.isAlert80());
            view.setAlert100(budget.isAlert100());
            view.setCreatedAt(budget.getCreatedAt());
            
            // Calculate spent
            BigDecimal spent = calculateSpent(budget, from, to);
            view.setSpent(spent);
            view.setRemaining(budget.getAmount().subtract(spent));
            double percentUsed = spent.divide(budget.getAmount(), 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
            view.setPercentUsed(percentUsed);
            
            views.add(view);
        }
        return views;
    }

    @Transactional(readOnly = true)
    public List<BudgetView> list(String userEmail, String period, Long groupId) {
        if (groupId == null) {
            return list(userEmail, period);
        }
        Group group = groupRepository.findById(groupId).orElseThrow();
        // Optional: validate membership of user in group (skipped if not available)
        List<Budget> budgets = budgetRepository.findAllByGroupAndPeriod(group, period);
        List<BudgetView> views = new ArrayList<>();
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        for (Budget budget : budgets) {
            BudgetView view = new BudgetView();
            view.setId(budget.getId());
            view.setUserId(budget.getUser() != null ? budget.getUser().getId() : null);
            view.setGroupId(group.getId());
            view.setCategoryId(budget.getCategory() != null ? budget.getCategory().getId() : null);
            view.setCategoryName(budget.getCategory() != null ? budget.getCategory().getName() : "All Categories");
            view.setPeriod(budget.getPeriod());
            view.setAmount(budget.getAmount());
            view.setAlert80(budget.isAlert80());
            view.setAlert100(budget.isAlert100());
            view.setCreatedAt(budget.getCreatedAt());

            java.math.BigDecimal spent = calculateSpent(budget, from, to);
            view.setSpent(spent);
            view.setRemaining(budget.getAmount().subtract(spent));
            double percentUsed = spent.compareTo(java.math.BigDecimal.ZERO) == 0 ? 0.0 : spent.divide(budget.getAmount(), 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
            view.setPercentUsed(percentUsed);
            views.add(view);
        }
        return views;
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> anomalies(String userEmail, String period, Long groupId, boolean base) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        LocalDate prevFrom = from.minusMonths(1);
        LocalDate prevTo = from.minusDays(1);
        List<Object[]> current = java.util.Collections.emptyList();
        List<Object[]> prev = java.util.Collections.emptyList();
        java.util.Map<Long, java.math.BigDecimal> currentBase = null;
        java.util.Map<Long, java.math.BigDecimal> prevBase = null;
        if (!base) {
            if (groupId != null) {
                Group group = groupRepository.findById(groupId).orElseThrow();
                current = expenseRepository.groupCategoryTotals(group.getId(), from, to);
                prev = expenseRepository.groupCategoryTotals(group.getId(), prevFrom, prevTo);
            } else {
                current = expenseRepository.userCategoryTotals(user.getId(), from, to);
                prev = expenseRepository.userCategoryTotals(user.getId(), prevFrom, prevTo);
            }
        } else {
            currentBase = sumByCategoryBase(user, groupId, from, to);
            prevBase = sumByCategoryBase(user, groupId, prevFrom, prevTo);
        }
        java.util.Map<Long, java.math.BigDecimal> prevMap = new java.util.HashMap<>();
        if (!base) {
            for (Object[] row : prev) {
                Long cid = row[0] == null ? -1L : ((Number) row[0]).longValue();
                prevMap.put(cid, (java.math.BigDecimal) row[2]);
            }
        } else {
            prevMap.putAll(prevBase);
        }
        List<java.util.Map<String, Object>> out = new ArrayList<>();
        if (!base) {
            for (Object[] row : current) {
                Long cid = row[0] == null ? -1L : ((Number) row[0]).longValue();
                String cname = (String) row[1];
                java.math.BigDecimal spent = (java.math.BigDecimal) row[2];
                java.math.BigDecimal prevSpent = prevMap.getOrDefault(cid, java.math.BigDecimal.ZERO);
                if (prevSpent.compareTo(java.math.BigDecimal.ZERO) == 0 && spent.compareTo(java.math.BigDecimal.valueOf(100)) < 0) continue;
                double deltaPct = prevSpent.compareTo(java.math.BigDecimal.ZERO) == 0 ? 100.0 : spent.subtract(prevSpent).divide(prevSpent, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
                if (deltaPct >= 50.0 && spent.compareTo(java.math.BigDecimal.valueOf(100)) >= 0) {
                    java.util.Map<String, Object> m = new java.util.HashMap<>();
                    m.put("categoryId", cid);
                    m.put("category", cname);
                    m.put("spent", spent);
                    m.put("prevSpent", prevSpent);
                    m.put("deltaPct", deltaPct);
                    if (base) m.put("currency", fxService.getBaseCurrency());
                    out.add(m);
                }
            }
        } else {
            for (var entry : currentBase.entrySet()) {
                Long cid = entry.getKey();
                java.math.BigDecimal spent = entry.getValue();
                java.math.BigDecimal prevSpent = prevMap.getOrDefault(cid, java.math.BigDecimal.ZERO);
                if (prevSpent.compareTo(java.math.BigDecimal.ZERO) == 0 && spent.compareTo(java.math.BigDecimal.valueOf(100)) < 0) continue;
                double deltaPct = prevSpent.compareTo(java.math.BigDecimal.ZERO) == 0 ? 100.0 : spent.subtract(prevSpent).divide(prevSpent, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
                if (deltaPct >= 50.0 && spent.compareTo(java.math.BigDecimal.valueOf(100)) >= 0) {
                    java.util.Map<String, Object> m = new java.util.HashMap<>();
                    m.put("categoryId", cid);
                    m.put("category", cid == -1L ? "Uncategorized" : null);
                    m.put("spent", spent);
                    m.put("prevSpent", prevSpent);
                    m.put("deltaPct", deltaPct);
                    m.put("currency", fxService.getBaseCurrency());
                    out.add(m);
                }
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> predicted(String userEmail, String period, Long groupId, boolean base) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        int totalDays = to.getDayOfMonth();
        int elapsedDays = java.time.LocalDate.now().isBefore(from) || java.time.LocalDate.now().isAfter(to) ? from.getDayOfMonth() : java.time.LocalDate.now().getDayOfMonth();
        java.math.BigDecimal spent;
        if (!base) {
            List<Object[]> totals = (groupId != null)
                    ? expenseRepository.groupCategoryTotals(groupId, from, to)
                    : expenseRepository.userCategoryTotals(user.getId(), from, to);
            spent = totals.stream().map(r -> (java.math.BigDecimal) r[2]).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        } else {
            java.util.List<com.expenseapp.expense.Expense> list = (groupId != null)
                    ? expenseRepository.findAllByGroupAndOccurredOnBetween(groupRepository.findById(groupId).orElseThrow(), from, to)
                    : expenseRepository.findAllByUserAndOccurredOnBetween(user, from, to);
            spent = list.stream()
                    .map(e -> fxService.convertToBase(e.getOccurredOn(), e.getCurrency(), e.getAmount()))
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        }
        java.math.BigDecimal daily = elapsedDays == 0 ? java.math.BigDecimal.ZERO : spent.divide(new java.math.BigDecimal(elapsedDays), 4, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal predicted = daily.multiply(new java.math.BigDecimal(totalDays)).setScale(2, java.math.RoundingMode.HALF_UP);
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("period", period);
        m.put("spentToDate", spent);
        m.put("predictedMonthEnd", predicted);
        m.put("method", "linear_daily_rate");
        if (base) m.put("currency", fxService.getBaseCurrency());
        return m;
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> variance(String userEmail, String period, Long groupId, Long categoryFilterId, boolean base) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Group group = null;
        if (groupId != null) {
            group = groupRepository.findById(groupId).orElseThrow();
        }

        // Collect budgets for the scope and period
        List<Budget> budgets = (group != null)
                ? budgetRepository.findAllByGroupAndPeriod(group, period)
                : budgetRepository.findAllByUserAndPeriod(user, period);

        java.util.Map<Long, java.math.BigDecimal> budgetByCat = new java.util.HashMap<>();
        java.util.Map<Long, String> catName = new java.util.HashMap<>();
        java.math.BigDecimal budgetAll = java.math.BigDecimal.ZERO;
        for (Budget b : budgets) {
            Long key = (b.getCategory() == null) ? -1L : b.getCategory().getId();
            String name = (b.getCategory() == null) ? "All Categories" : b.getCategory().getName();
            if (categoryFilterId != null && b.getCategory() != null && !b.getCategory().getId().equals(categoryFilterId)) continue;
            budgetByCat.put(key, budgetByCat.getOrDefault(key, java.math.BigDecimal.ZERO).add(b.getAmount()));
            catName.put(key, name);
            if (b.getCategory() == null) {
                budgetAll = budgetAll.add(b.getAmount());
            }
        }

        // Get spend totals for the period
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        List<Object[]> totals = java.util.Collections.emptyList();
        java.util.Map<Long, java.math.BigDecimal> baseTotals = null;
        if (!base) {
            totals = (group != null)
                    ? expenseRepository.groupCategoryTotals(group.getId(), from, to)
                    : expenseRepository.userCategoryTotals(user.getId(), from, to);
        } else {
            baseTotals = sumByCategoryBase(user, groupId, from, to);
        }

        java.util.Map<Long, java.math.BigDecimal> spentByCat = new java.util.HashMap<>();
        if (!base) {
            for (Object[] row : totals) {
                Long cid = (row[0] == null) ? -1L : ((Number) row[0]).longValue();
                java.math.BigDecimal amt = (java.math.BigDecimal) row[2];
                if (categoryFilterId != null && cid != -1L && !cid.equals(categoryFilterId)) continue;
                spentByCat.put(cid, spentByCat.getOrDefault(cid, java.math.BigDecimal.ZERO).add(amt));
                if (!catName.containsKey(cid)) catName.put(cid, (String) row[1]);
            }
        } else {
            for (var entry : baseTotals.entrySet()) {
                Long cid = entry.getKey();
                java.math.BigDecimal amt = entry.getValue();
                if (categoryFilterId != null && cid != -1L && !cid.equals(categoryFilterId)) continue;
                spentByCat.put(cid, spentByCat.getOrDefault(cid, java.math.BigDecimal.ZERO).add(amt));
                // catName may remain null here; UI can map by ID if needed
            }
        }

        // Build variance list
        java.util.Set<Long> cats = new java.util.HashSet<>();
        cats.addAll(budgetByCat.keySet());
        cats.addAll(spentByCat.keySet());
        List<java.util.Map<String, Object>> out = new ArrayList<>();
        for (Long cid : cats) {
            if (categoryFilterId != null && cid != -1L && !cid.equals(categoryFilterId)) continue;
            java.math.BigDecimal bud = budgetByCat.getOrDefault(cid, java.math.BigDecimal.ZERO);
            java.math.BigDecimal spent = spentByCat.getOrDefault(cid, java.math.BigDecimal.ZERO);
            java.math.BigDecimal variance = bud.subtract(spent).setScale(2, java.math.RoundingMode.HALF_UP);
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("categoryId", cid);
            String categoryNameValue = catName.getOrDefault(cid, cid == -1L ? "All Categories" : "Uncategorized");
            m.put("category", categoryNameValue);
            m.put("categoryName", categoryNameValue); // Add categoryName for frontend compatibility
            m.put("budget", bud);
            m.put("spent", spent);
            m.put("variance", variance);
            if (base) m.put("currency", fxService.getBaseCurrency());
            out.add(m);
        }
        // Optionally include overall when an "all categories" budget exists and no category filter
        if (categoryFilterId == null && budgetAll.compareTo(java.math.BigDecimal.ZERO) > 0) {
            java.math.BigDecimal spentTotal;
            if (!base) {
                spentTotal = totals.stream().map(r -> (java.math.BigDecimal) r[2]).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            } else {
                spentTotal = spentByCat.values().stream().reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            }
            java.util.Map<String, Object> overall = new java.util.HashMap<>();
            overall.put("categoryId", -1L);
            overall.put("category", "All Categories (Overall)");
            overall.put("categoryName", "All Categories (Overall)"); // Add categoryName for frontend compatibility
            overall.put("budget", budgetAll);
            overall.put("spent", spentTotal);
            overall.put("variance", budgetAll.subtract(spentTotal).setScale(2, java.math.RoundingMode.HALF_UP));
            if (base) overall.put("currency", fxService.getBaseCurrency());
            out.add(overall);
        }
        return out;
    }

    private java.util.Map<Long, java.math.BigDecimal> sumByCategoryBase(User user, Long groupId, LocalDate from, LocalDate to) {
        java.util.List<com.expenseapp.expense.Expense> list = (groupId != null)
                ? expenseRepository.findAllByGroupAndOccurredOnBetween(groupRepository.findById(groupId).orElseThrow(), from, to)
                : expenseRepository.findAllByUserAndOccurredOnBetween(user, from, to);
        java.util.Map<Long, java.math.BigDecimal> map = new java.util.HashMap<>();
        for (com.expenseapp.expense.Expense e : list) {
            Long cid = (e.getCategory() == null) ? -1L : e.getCategory().getId();
            java.math.BigDecimal val = fxService.convertToBase(e.getOccurredOn(), e.getCurrency(), e.getAmount());
            map.put(cid, map.getOrDefault(cid, java.math.BigDecimal.ZERO).add(val));
        }
        return map;
    }

    @Transactional
    public int checkAlerts(String period) {
        // System-level check for ALL budgets (use for scheduled jobs only)
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        
        List<Budget> allBudgets = budgetRepository.findAll().stream()
                .filter(b -> b.getPeriod().equals(period))
                .filter(b -> b.getUser() != null) // Guard against orphaned budgets
                .toList();
        
        int alertCount = 0;
        for (Budget budget : allBudgets) {
            // Guard against invalid amounts to avoid division-by-zero
            BigDecimal amount = budget.getAmount();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal spent = calculateSpent(budget, from, to);
            double percentUsed = spent.divide(amount, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
            
            if (budget.isAlert100() && percentUsed >= 100) {
                Long userId = budget.getUser().getId();
                String title = "Budget Exceeded";
                long dup = notificationRepository.countByUserAndTypeAndTitleAndBudgetId(userId, "BUDGET_ALERT", title, budget.getId());
                if (dup == 0) {
                    notificationPublisher.publish(userId, "BUDGET_ALERT",
                            title, "You have exceeded your budget for " + 
                            (budget.getCategory() != null ? budget.getCategory().getName() : "All Categories"),
                            "{\"budgetId\":" + budget.getId() + ",\"percent\":" + percentUsed + "}");
                    alertCount++;
                }
            } else if (budget.isAlert80() && percentUsed >= 80) {
                Long userId = budget.getUser().getId();
                String title = "Budget Warning";
                long dup = notificationRepository.countByUserAndTypeAndTitleAndBudgetId(userId, "BUDGET_ALERT", title, budget.getId());
                if (dup == 0) {
                    notificationPublisher.publish(userId, "BUDGET_ALERT",
                            title, "You are approaching your budget limit for " + 
                            (budget.getCategory() != null ? budget.getCategory().getName() : "All Categories"),
                            "{\"budgetId\":" + budget.getId() + ",\"percent\":" + percentUsed + "}");
                    alertCount++;
                }
            }
        }
        return alertCount;
    }

    @Transactional
    public int checkAlertsForUser(String email, String period) {
        // User-specific check - only process budgets for the authenticated user
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        
        // Only get budgets for THIS user
        List<Budget> userBudgets = budgetRepository.findAll().stream()
                .filter(b -> b.getPeriod().equals(period))
                .filter(b -> b.getUser() != null && b.getUser().getId().equals(user.getId()))
                .toList();
        
        int alertCount = 0;
        for (Budget budget : userBudgets) {
            // Guard against invalid amounts
            BigDecimal amount = budget.getAmount();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            
            BigDecimal spent = calculateSpent(budget, from, to);
            double percentUsed = spent.divide(amount, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
            
            if (budget.isAlert100() && percentUsed >= 100) {
                String title = "Budget Exceeded";
                long dup = notificationRepository.countByUserAndTypeAndTitleAndBudgetId(user.getId(), "BUDGET_ALERT", title, budget.getId());
                if (dup == 0) {
                    notificationPublisher.publish(user.getId(), "BUDGET_ALERT",
                            title, "You have exceeded your budget for " + 
                            (budget.getCategory() != null ? budget.getCategory().getName() : "All Categories"),
                            "{\"budgetId\":" + budget.getId() + ",\"percent\":" + percentUsed + "}");
                    alertCount++;
                }
            } else if (budget.isAlert80() && percentUsed >= 80) {
                String title = "Budget Warning";
                long dup = notificationRepository.countByUserAndTypeAndTitleAndBudgetId(user.getId(), "BUDGET_ALERT", title, budget.getId());
                if (dup == 0) {
                    notificationPublisher.publish(user.getId(), "BUDGET_ALERT",
                            title, "You are approaching your budget limit for " + 
                            (budget.getCategory() != null ? budget.getCategory().getName() : "All Categories"),
                            "{\"budgetId\":" + budget.getId() + ",\"percent\":" + percentUsed + "}");
                    alertCount++;
                }
            }
        }
        return alertCount;
    }

    private BigDecimal calculateSpent(Budget budget, LocalDate from, LocalDate to) {
        if (budget.getGroup() != null) {
            // Group budget
            var totals = expenseRepository.groupCategoryTotals(budget.getGroup().getId(), from, to);
            if (budget.getCategory() != null) {
                return totals.stream()
                        .filter(row -> budget.getCategory().getId().equals(row[0]))
                        .map(row -> (BigDecimal) row[2])
                        .findFirst()
                        .orElse(BigDecimal.ZERO);
            } else {
                return totals.stream()
                        .map(row -> (BigDecimal) row[2])
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        } else {
            // Personal budget
            var totals = expenseRepository.userCategoryTotals(budget.getUser().getId(), from, to);
            if (budget.getCategory() != null) {
                return totals.stream()
                        .filter(row -> budget.getCategory().getId().equals(row[0]))
                        .map(row -> (BigDecimal) row[2])
                        .findFirst()
                        .orElse(BigDecimal.ZERO);
            } else {
                return totals.stream()
                        .map(row -> (BigDecimal) row[2])
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        }
    }

    // Lightweight mapper for immediate responses (create/update)
    private BudgetView toView(Budget budget) {
        BudgetView view = new BudgetView();
        view.setId(budget.getId());
        view.setUserId(budget.getUser() != null ? budget.getUser().getId() : null);
        view.setGroupId(budget.getGroup() != null ? budget.getGroup().getId() : null);
        view.setCategoryId(budget.getCategory() != null ? budget.getCategory().getId() : null);
        view.setCategoryName(budget.getCategory() != null ? budget.getCategory().getName() : "All Categories");
        view.setPeriod(budget.getPeriod());
        view.setAmount(budget.getAmount());
        view.setAlert80(budget.isAlert80());
        view.setAlert100(budget.isAlert100());
        view.setCreatedAt(budget.getCreatedAt());
        return view;
    }
}
