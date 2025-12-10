package com.expenseapp.expense;

import com.expenseapp.expense.dto.ExpenseCreateRequest;
import com.expenseapp.expense.dto.ExpenseUpdateRequest;
import com.expenseapp.expense.dto.ExpenseView;
import com.expenseapp.expense.dto.ReceiptView;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.storage.FileStorageService;
import com.expenseapp.group.Group;
import com.expenseapp.group.GroupRepository;
import com.expenseapp.fx.FXService;
import com.expenseapp.acl.ACLEntryService;
import com.expenseapp.audit.AccessLogService;
import com.expenseapp.receipt.Receipt;
import com.expenseapp.bill.BillRepository;
// Note: use fully-qualified type in fields/ctor to avoid shadowing by com.expenseapp.expense.ReceiptRepository
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final com.expenseapp.receipt.ReceiptRepository receiptRepository;
    private final FileStorageService fileStorageService;
    private final GroupRepository groupRepository;
    private final FXService fxService;
    private final ACLEntryService aclService;
    private final AccessLogService accessLogService;
    private final SplitShareRepository splitShareRepository;
    private final com.expenseapp.group.GroupMemberRepository groupMemberRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final BillRepository billRepository;
    private final com.expenseapp.company.CompanyMemberRepository companyMemberRepository;
    private final com.expenseapp.company.CompanyRepository companyRepository;
    private static final Logger log = LoggerFactory.getLogger(ExpenseService.class);

    public ExpenseService(ExpenseRepository expenseRepository, CategoryRepository categoryRepository, UserRepository userRepository,
                          com.expenseapp.receipt.ReceiptRepository receiptRepository, FileStorageService fileStorageService,
                          GroupRepository groupRepository, FXService fxService, ACLEntryService aclService, AccessLogService accessLogService,
                          SplitShareRepository splitShareRepository, com.expenseapp.group.GroupMemberRepository groupMemberRepository,
                          org.springframework.jdbc.core.JdbcTemplate jdbcTemplate, BillRepository billRepository,
                          com.expenseapp.company.CompanyMemberRepository companyMemberRepository,
                          com.expenseapp.company.CompanyRepository companyRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.receiptRepository = receiptRepository;
        this.fileStorageService = fileStorageService;
        this.splitShareRepository = splitShareRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.groupRepository = groupRepository;
        this.fxService = fxService;
        this.aclService = aclService;
        this.accessLogService = accessLogService;
        this.billRepository = billRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public ExpenseView create(String email, ExpenseCreateRequest req, Long companyId) {
        log.info("[Expenses] create() start email={}, companyId={}, amount={}, currency={}, occurredOn={}, categoryId={}, groupId={}, merchant={}, reimbursable={}",
                email, companyId, req != null ? req.getAmount() : null, req != null ? req.getCurrency() : null,
                req != null ? req.getOccurredOn() : null, req != null ? req.getCategoryId() : null,
                req != null ? req.getGroupId() : null, req != null ? req.getMerchant() : null,
                req != null && req.isReimbursable());
        try {
            User user = userRepository.findByEmail(email).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));
            log.debug("[Expenses] Using user id={}", user.getId());

            Expense e = new Expense();
            e.setUser(user);
            // STRICT ISOLATION: Normalize company assignment
            Long resolvedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
            e.setCompanyId(resolvedCompanyId); // Set company for multi-tenant isolation
            
            log.info("[Expenses] Creating expense with companyId={} -> resolvedCompanyId={} (personal={}, company={})", 
                    companyId, resolvedCompanyId, resolvedCompanyId == null, resolvedCompanyId != null);
            e.setAmount(req.getAmount());
            e.setCurrency(req.getCurrency());
            e.setOccurredOn(req.getOccurredOn());
            e.setDescription(req.getDescription());
            e.setNotes(req.getNotes());
            e.setMerchant(req.getMerchant());
            e.setReimbursable(req.isReimbursable());
            if (req.getCategoryId() != null) {
                Category c = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Category not found"));
                e.setCategory(c);
                log.debug("[Expenses] Category id={} validated", c.getId());
            }
            if (req.getGroupId() != null) {
                Group g = groupRepository.findById(req.getGroupId())
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Group not found"));
                e.setGroup(g);
                log.debug("[Expenses] Group id={} validated", g.getId());
            }
            // Ensure we have a historical FX rate for occurredOn/currency before returning view
            java.math.BigDecimal ensured = fxService.ensureRate(e.getOccurredOn(), e.getCurrency());
            log.debug("[Expenses] ensureRate ok -> {}", ensured);
            e = expenseRepository.save(e);
            log.info("[Expenses] Created expense id={}", e.getId());
            
            // Create split shares if participants are provided
            if (req.getParticipants() != null && !req.getParticipants().isEmpty()) {
                log.info("[Expenses] Creating split shares for {} participants", req.getParticipants().size());
                createSplitShares(e, req.getParticipants(), req.getSplitType());
            }
            
            return toView(e);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.error("[Expenses] Data integrity violation creating expense: {}", dive.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid data (possibly invalid company/category/group)");
        } catch (org.springframework.web.server.ResponseStatusException rse) {
            throw rse;
        } catch (Exception ex) {
            log.error("[Expenses] create() failed: {}", ex.toString(), ex);
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create expense");
        }
    }

    @Transactional(readOnly = true)
    public List<ExpenseView> list(String email, LocalDate from, LocalDate to, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();

        // Normalize company scope
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;

        // Default date window if not provided: last 90 days
        LocalDate toEff = (to != null) ? to : LocalDate.now();
        LocalDate fromEff = (from != null) ? from : toEff.minusDays(90);

        log.info("[Expenses] list() scoped fetch email={}, role={}, companyId(raw)={}, normalizedCompanyId={}, fromEff={}, toEff={}",
                email, user.getRole(), companyId, normalizedCompanyId, fromEff, toEff);

        List<Expense> scoped;
        if (normalizedCompanyId == null) {
            // Personal expenses - user sees only their own
            scoped = expenseRepository.findPersonalByUserAndDate(user, fromEff, toEff);
        } else {
            // Company expenses - role-based visibility
            // SUPER_ADMIN and ADMIN can see ALL expenses in the company
            if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
                // SUPER_ADMIN sees all expenses in any company
                scoped = expenseRepository.findAllByCompanyAndDate(normalizedCompanyId, fromEff, toEff);
                log.info("[Expenses] SUPER_ADMIN viewing all {} expenses in company {}", scoped.size(), normalizedCompanyId);
            } else {
                // Check if user is ADMIN in this company
                com.expenseapp.company.Company company = companyRepository.findById(normalizedCompanyId)
                    .orElseThrow(() -> new IllegalArgumentException("Company not found"));
                java.util.Optional<com.expenseapp.company.CompanyMember> memberOpt = 
                    companyMemberRepository.findByCompanyAndUser(company, user);
                
                String memberRole = memberOpt.isPresent() ? memberOpt.get().getRole() : null;
                boolean isCompanyAdmin = "ADMIN".equals(memberRole);
                boolean isManager = "MANAGER".equals(memberRole);
                
                if (isCompanyAdmin) {
                    // ADMIN sees all expenses in their company
                    scoped = expenseRepository.findAllByCompanyAndDate(normalizedCompanyId, fromEff, toEff);
                    log.info("[Expenses] Company ADMIN viewing all {} expenses in company {}", scoped.size(), normalizedCompanyId);
                } else if (isManager) {
                    // MANAGER sees own expenses + employee expenses
                    scoped = expenseRepository.findManagerVisibleExpenses(user.getId(), normalizedCompanyId, fromEff, toEff);
                    log.info("[Expenses] MANAGER viewing {} expenses (own + employees) in company {}", scoped.size(), normalizedCompanyId);
                } else {
                    // EMPLOYEE sees only their own expenses
                    scoped = expenseRepository.findEmployeeOwnExpenses(user.getId(), normalizedCompanyId, fromEff, toEff);
                    log.info("[Expenses] EMPLOYEE viewing own {} expenses in company {}", scoped.size(), normalizedCompanyId);
                }
            }
        }

        java.util.List<ExpenseView> result = scoped.stream()
                .map(e -> {
                    try {
                        return toView(e);
                    } catch (Exception ex) {
                        log.error("[Expenses] Failed to build view for expense id={} on {} (currency {}): {}", e.getId(), e.getOccurredOn(), e.getCurrency(), ex.toString());
                        boolean hasSplitShares = !splitShareRepository.findByExpenseId(e.getId()).isEmpty();
                        return new ExpenseView(
                                e.getId(), e.getAmount(), e.getCurrency(), null, fxService.getBaseCurrency(), e.getOccurredOn(),
                                e.getCompanyId(),
                                e.getCategory() != null ? e.getCategory().getId() : null,
                                e.getCategory() != null ? e.getCategory().getName() : null,
                                e.getDescription(), e.getNotes(), e.getMerchant(), e.isReimbursable(), e.getCreatedAt(), hasSplitShares,
                                null, null, null, null
                        );
                    }
                })
                .toList();

        log.info("[Expenses] list() returning {} items for companyId={} (personal={}, company={})",
                result.size(), companyId, normalizedCompanyId == null, normalizedCompanyId != null);
        return result;
    }

    @Transactional
    public ExpenseView get(String email, Long id, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense e = expenseRepository.findById(id).orElseThrow();
        // Verify company access if companyId is provided
        if (companyId != null && companyId > 0 && (e.getCompanyId() == null || !e.getCompanyId().equals(companyId))) {
            throw new IllegalArgumentException("Not found");
        }
        if (!e.getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", id, "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_GET", "EXPENSE", id, "DENIED", null);
                throw new IllegalArgumentException("Not found");
            }
            accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_GET", "EXPENSE", id, "ALLOWED", null);
        }
        return toView(e);
    }

    @Transactional
    public ExpenseView update(String email, Long id, ExpenseUpdateRequest req, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense e = expenseRepository.findById(id).orElseThrow();
        
        // SUPER_ADMIN and ADMIN can update any expense
        if (user.getRole() != com.expenseapp.user.Role.SUPER_ADMIN && 
            user.getRole() != com.expenseapp.user.Role.ADMIN) {
            // Verify company access if companyId is provided
            if (companyId != null && companyId > 0 && (e.getCompanyId() == null || !e.getCompanyId().equals(companyId))) {
                throw new IllegalArgumentException("Not found");
            }
            if (!e.getUser().getId().equals(user.getId())) {
                boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", id, "WRITE");
                if (!allowed) {
                    accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_UPDATE", "EXPENSE", id, "DENIED", null);
                    throw new IllegalArgumentException("Not found");
                }
                accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_UPDATE", "EXPENSE", id, "ALLOWED", null);
            }
        }
        if (req.getAmount() != null) e.setAmount(req.getAmount());
        if (req.getCurrency() != null) e.setCurrency(req.getCurrency());
        if (req.getOccurredOn() != null) e.setOccurredOn(req.getOccurredOn());
        if (req.getNotes() != null) e.setNotes(req.getNotes());
        if (req.getMerchant() != null) e.setMerchant(req.getMerchant());
        if (req.getReimbursable() != null) e.setReimbursable(req.getReimbursable());
        if (req.getCategoryId() != null) {
            Category c = categoryRepository.findById(req.getCategoryId()).orElseThrow();
            e.setCategory(c);
        }
        // Ensure rate for the (possibly updated) date/currency
        fxService.ensureRate(e.getOccurredOn(), e.getCurrency());
        return toView(e);
    }

    @Transactional
    public void delete(String email, Long id, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense e = expenseRepository.findById(id).orElseThrow();
        
        // SUPER_ADMIN and ADMIN can delete any expense
        if (user.getRole() != com.expenseapp.user.Role.SUPER_ADMIN && 
            user.getRole() != com.expenseapp.user.Role.ADMIN) {
            // Verify company access if companyId is provided
            if (companyId != null && companyId > 0 && (e.getCompanyId() == null || !e.getCompanyId().equals(companyId))) {
                throw new IllegalArgumentException("Not found");
            }
            if (!e.getUser().getId().equals(user.getId())) {
                boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", id, "WRITE");
                if (!allowed) {
                    accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_DELETE", "EXPENSE", id, "DENIED", null);
                    throw new IllegalArgumentException("Not found");
                }
                accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_DELETE", "EXPENSE", id, "ALLOWED", null);
            }
        }
        
        // Delete associated bills before deleting expense
        java.util.List<com.expenseapp.bill.Bill> bills = billRepository.findByExpenseId(id);
        if (!bills.isEmpty()) {
            log.info("Deleting {} bill(s) associated with expense {}", bills.size(), id);
            billRepository.deleteAll(bills);
        }
        
        expenseRepository.delete(e);
    }

    @Transactional
    public ReceiptView uploadReceipt(String email, Long expenseId, MultipartFile file) throws java.io.IOException {
        log.info("[RECEIPT] Upload started - email: {}, expenseId: {}, fileName: {}", email, expenseId, file.getOriginalFilename());
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense e = expenseRepository.findById(expenseId).orElseThrow();
        if (!e.getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", expenseId, "WRITE");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_UPLOAD", "EXPENSE", expenseId, "DENIED", null);
                throw new IllegalArgumentException("Not found");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_UPLOAD", "EXPENSE", expenseId, "ALLOWED", null);
        }
        log.info("[RECEIPT] Saving file to storage...");
        String uri = fileStorageService.save("receipts/" + user.getId(), file);
        log.info("[RECEIPT] File saved to: {}", uri);
        Receipt r = new Receipt();
        r.setExpense(e);
        // Map storage path to fileName; capture contentType and size when available
        // Persist both full storage path (fileUri) and basename (fileName)
        r.setFileUri(uri);
        r.setFileName(java.nio.file.Paths.get(uri).getFileName().toString());
        r.setContentType(file.getContentType());
        r.setFileSize(file.getSize());
        log.info("[RECEIPT] Creating receipt record - fileName: {}, contentType: {}, size: {}", r.getFileName(), r.getContentType(), r.getFileSize());
        // status defaults to UPLOADED; extractedJson remains null initially
        r = receiptRepository.save(r);
        log.info("[RECEIPT] Receipt saved successfully - id: {}", r.getId());
        return new ReceiptView(r.getId(), r.getFileName(), r.getStatus(), r.getCreatedAt(), r.getExtractedJson());
    }

    @Transactional(readOnly = true)
    public List<ReceiptView> listReceipts(String email, Long expenseId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense e = expenseRepository.findById(expenseId).orElseThrow();
        if (!e.getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", expenseId, "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_RECEIPTS_LIST", "EXPENSE", expenseId, "DENIED", null);
                throw new IllegalArgumentException("Not found");
            }
            accessLogService.log(user.getId(), user.getEmail(), "EXPENSE_RECEIPTS_LIST", "EXPENSE", expenseId, "ALLOWED", null);
        }
        return receiptRepository.findAll().stream()
                .filter(rc -> rc.getExpense().getId().equals(expenseId))
                .map(rc -> new ReceiptView(rc.getId(), rc.getFileName(), rc.getStatus(), rc.getCreatedAt(), rc.getExtractedJson()))
                .toList();
    }

    @Transactional
    public void linkExpenseToGroup(String email, Long expenseId, Long groupId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense expense = expenseRepository.findById(expenseId).orElseThrow(() -> 
            new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Expense not found"));
        
        // Check access - user must be the owner
        if (!expense.getUser().getId().equals(user.getId())) {
            accessLogService.log(user.getId(), email, "EXPENSE_LINK_GROUP", "EXPENSE", expenseId, "DENIED", "Not owner");
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Not authorized");
        }
        
        // Verify group exists and user has access
        com.expenseapp.group.Group group = null;
        if (groupId != null) {
            group = groupRepository.findById(groupId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Group not found"));
            
            // Check if user is a member of the group
            boolean isMember = groupMemberRepository.findByGroupAndUser(group, user).isPresent();
            
            if (!isMember) {
                accessLogService.log(user.getId(), email, "EXPENSE_LINK_GROUP", "EXPENSE", expenseId, "DENIED", "Not a group member");
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Not a member of this group");
            }
            
            expense.setGroup(group);
            
            // Verify split shares exist for all group members
            java.util.List<SplitShare> existingSplits = splitShareRepository.findByExpenseId(expenseId);
            java.util.List<com.expenseapp.group.GroupMember> groupMembers = groupMemberRepository.findAllByGroup(group);
            
            // Check if we need to create/update split shares for group members
            java.util.Set<Long> existingUserIds = existingSplits.stream()
                .map(ss -> ss.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());
            
            java.util.Set<Long> groupMemberIds = groupMembers.stream()
                .map(gm -> gm.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());
            
            log.info("[Expenses] Linking expense {} to group {}: existing splits={}, group members={}", 
                expenseId, groupId, existingUserIds, groupMemberIds);
            
            // If split shares don't match group members, recreate them
            if (!existingUserIds.equals(groupMemberIds)) {
                log.info("[Expenses] Split shares don't match group members, recreating for expense {}", expenseId);
                
                // Delete existing splits
                existingSplits.forEach(splitShareRepository::delete);
                
                // Create new splits for all group members
                java.util.List<Long> memberIds = groupMembers.stream()
                    .map(gm -> gm.getUser().getId())
                    .collect(java.util.stream.Collectors.toList());
                
                createSplitShares(expense, memberIds, "equal");
                log.info("[Expenses] Created {} split shares for group members", memberIds.size());
            }
        } else {
            expense.setGroup(null);
        }
        
        expenseRepository.save(expense);
        
        // Post expense as a message in the group chat
        if (groupId != null && group != null) {
            postExpenseToGroupChat(expense, group, user);
        }
        
        accessLogService.log(user.getId(), email, "EXPENSE_LINK_GROUP", "EXPENSE", expenseId, "ALLOWED", 
            groupId != null ? "Linked to group " + groupId : "Unlinked from group");
        log.info("[Expenses] Expense {} {} group {}", expenseId, groupId != null ? "linked to" : "unlinked from", groupId);
    }
    
    private void postExpenseToGroupChat(Expense expense, com.expenseapp.group.Group grp, User user) {
        try {
            // Get all split shares for this expense
            java.util.List<SplitShare> splits = splitShareRepository.findByExpenseId(expense.getId());
            
            // Build the split title (merchant or description)
            String splitTitle = expense.getMerchant();
            if (splitTitle == null || splitTitle.trim().isEmpty()) {
                splitTitle = expense.getDescription();
            }
            if (splitTitle == null || splitTitle.trim().isEmpty()) {
                splitTitle = "Expense";
            }
            
            // Get involved user IDs
            String involvedIds = splits.stream()
                .map(s -> String.valueOf(s.getUser().getId()))
                .collect(java.util.stream.Collectors.joining(","));
            
            // Insert message into group_messages table
            String sql = "INSERT INTO group_messages(group_id, sender_user_id, type, text, split_title, split_total_amount, split_currency, split_involved_ids, created_at) " +
                         "VALUES(?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            jdbcTemplate.update(sql,
                grp.getId(),
                user.getId(),
                "split",
                String.format("Added expense: %s", splitTitle),
                splitTitle,
                expense.getAmount(),
                expense.getCurrency(),
                involvedIds
            );
            
            log.info("[Expenses] Posted expense {} to group {} chat", expense.getId(), grp.getId());
        } catch (Exception e) {
            log.error("[Expenses] Failed to post expense to group chat", e);
            // Don't fail the whole operation if posting to chat fails
        }
    }

    @Transactional
    public java.util.Map<String, Object> getSplitShares(String email, Long expenseId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Expense expense = expenseRepository.findById(expenseId).orElseThrow(() -> 
            new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Expense not found"));
        
        // Check access
        if (!expense.getUser().getId().equals(user.getId())) {
            accessLogService.log(user.getId(), email, "EXPENSE_SPLITS_GET", "EXPENSE", expenseId, "DENIED", "Not owner");
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Not authorized");
        }
        
        List<SplitShare> shares = splitShareRepository.findByExpenseId(expenseId);
        List<java.util.Map<String, Object>> sharesList = new java.util.ArrayList<>();
        
        for (SplitShare share : shares) {
            java.util.Map<String, Object> shareMap = new java.util.HashMap<>();
            shareMap.put("userId", share.getUser().getId());
            shareMap.put("userName", share.getUser().getName());
            shareMap.put("userEmail", share.getUser().getEmail());
            shareMap.put("shareAmount", share.getShareAmount());
            shareMap.put("status", share.getStatus());
            sharesList.add(shareMap);
        }
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("expenseId", expenseId);
        result.put("splitShares", sharesList);
        accessLogService.log(user.getId(), email, "EXPENSE_SPLITS_GET", "EXPENSE", expenseId, "ALLOWED", null);
        return result;
    }

    /**
     * Create split shares for an expense based on participants and split type
     */
    private void createSplitShares(Expense expense, List<Long> participantIds, String splitType) {
        if (participantIds == null || participantIds.isEmpty()) {
            return;
        }
        
        // For now, only support equal split
        // TODO: Add support for custom and percentage splits
        java.math.BigDecimal totalAmount = expense.getAmount();
        int participantCount = participantIds.size();
        java.math.BigDecimal shareAmount = totalAmount.divide(
            new java.math.BigDecimal(participantCount), 
            2, 
            java.math.RoundingMode.HALF_UP
        );
        
        log.info("[Expenses] Creating {} equal split shares of {} each", participantCount, shareAmount);
        
        for (Long userId : participantIds) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.warn("[Expenses] Skipping split share for non-existent user id={}", userId);
                continue;
            }
            
            SplitShare share = new SplitShare();
            share.setExpense(expense);
            share.setUser(user);
            share.setShareAmount(shareAmount);
            share.setStatus("PENDING");
            splitShareRepository.save(share);
            log.debug("[Expenses] Created split share for user id={}, amount={}", userId, shareAmount);
        }
    }

    private ExpenseView toView(Expense e) {
        java.math.BigDecimal baseAmount = null;
        String baseCurrency = fxService.getBaseCurrency();
        try {
            // Do not fetch/write rates during listing; just read existing (falls back to 1:1 if missing)
            baseAmount = fxService.convertToBase(e.getOccurredOn(), e.getCurrency(), e.getAmount());
        } catch (Exception ex) {
            log.error("[Expenses] FX conversion failed for expense id={} on {} (currency {}): {}", e.getId(), e.getOccurredOn(), e.getCurrency(), ex.toString());
            // baseAmount remains null to keep response stable
        }
        // Check if expense has split shares
        boolean hasSplitShares = !splitShareRepository.findByExpenseId(e.getId()).isEmpty();
        
        // Get receipt information
        String receiptUrl = null;
        String receiptFileName = null;
        Long receiptFileSize = null;
        String receiptFileType = null;
        
        java.util.List<com.expenseapp.receipt.Receipt> receipts = receiptRepository.findAll().stream()
                .filter(r -> r.getExpense().getId().equals(e.getId()))
                .toList();
        if (!receipts.isEmpty()) {
            com.expenseapp.receipt.Receipt receipt = receipts.get(0);
            receiptFileName = receipt.getFileName();
            receiptFileSize = receipt.getFileSize();
            receiptFileType = receipt.getContentType();
            // Generate receipt URL (assuming receipts are served from /api/v1/receipts/{id}/download)
            receiptUrl = "/api/v1/receipts/" + receipt.getId() + "/download";
        }
        
        return new ExpenseView(
                e.getId(), e.getAmount(), e.getCurrency(), baseAmount, baseCurrency, e.getOccurredOn(),
                e.getCompanyId(),
                e.getCategory() != null ? e.getCategory().getId() : null,
                e.getCategory() != null ? e.getCategory().getName() : null,
                e.getDescription(), e.getNotes(), e.getMerchant(), e.isReimbursable(), e.getCreatedAt(), hasSplitShares,
                receiptUrl, receiptFileName, receiptFileSize, receiptFileType
        );
    }
    
    /**
     * Comprehensive search for expenses with multiple filter options
     */
    public List<ExpenseView> searchExpenses(String userEmail, Long companyId, Long categoryId, 
                                           String currency, String merchant, String description,
                                           java.math.BigDecimal minAmount, java.math.BigDecimal maxAmount,
                                           LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
        
        Long cid = (companyId != null && companyId > 0) ? companyId : null;
        
        List<Expense> expenses = expenseRepository.searchExpenses(
                user, cid, categoryId, currency, merchant, description,
                minAmount, maxAmount, startDate, endDate
        );
        
        return expenses.stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public ExpenseView approve(String approverEmail, Long expenseId, Long companyId, String notes) {
        User approver = userRepository.findByEmail(approverEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + approverEmail));
        
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + expenseId));
        
        // Permission check: Only MANAGER, ADMIN, or SUPER_ADMIN can approve
        boolean canApprove = false;
        
        if (approver.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            canApprove = true;
        } else if (companyId != null && companyId > 0) {
            // Check company role
            com.expenseapp.company.CompanyMember membership = companyMemberRepository
                    .findByCompanyIdAndUserId(companyId, approver.getId())
                    .orElse(null);
            
            if (membership != null) {
                String role = membership.getRole();
                // ADMIN can approve all company expenses
                if ("ADMIN".equals(role)) {
                    canApprove = true;
                }
                // MANAGER can approve team expenses (if expense is in their team)
                else if ("MANAGER".equals(role)) {
                    // For now, allow managers to approve any company expense
                    // TODO: Add team-based filtering if needed
                    canApprove = true;
                }
            }
        }
        
        if (!canApprove) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "You don't have permission to approve expenses"
            );
        }
        
        // Update expense status
        expense.setApprovalStatus("APPROVED");
        expense.setApprovedAt(java.time.Instant.now());
        if (notes != null && !notes.isBlank()) {
            String currentNotes = expense.getNotes();
            expense.setNotes(currentNotes != null ? currentNotes + "\n[Approved by " + approverEmail + "]: " + notes : "[Approved by " + approverEmail + "]: " + notes);
        }
        
        expense = expenseRepository.save(expense);
        log.info("[ExpenseService] Expense {} approved by {}", expenseId, approverEmail);
        
        return toView(expense);
    }

    @Transactional
    public ExpenseView reject(String approverEmail, Long expenseId, Long companyId, String reason) {
        User approver = userRepository.findByEmail(approverEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + approverEmail));
        
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + expenseId));
        
        // Permission check: Only MANAGER, ADMIN, or SUPER_ADMIN can reject
        boolean canReject = false;
        
        if (approver.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            canReject = true;
        } else if (companyId != null && companyId > 0) {
            // Check company role
            com.expenseapp.company.CompanyMember membership = companyMemberRepository
                    .findByCompanyIdAndUserId(companyId, approver.getId())
                    .orElse(null);
            
            if (membership != null) {
                String role = membership.getRole();
                // ADMIN can reject all company expenses
                if ("ADMIN".equals(role)) {
                    canReject = true;
                }
                // MANAGER can reject team expenses
                else if ("MANAGER".equals(role)) {
                    canReject = true;
                }
            }
        }
        
        if (!canReject) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "You don't have permission to reject expenses"
            );
        }
        
        // Update expense status
        expense.setApprovalStatus("REJECTED");
        if (reason != null && !reason.isBlank()) {
            String currentNotes = expense.getNotes();
            expense.setNotes(currentNotes != null ? currentNotes + "\n[Rejected by " + approverEmail + "]: " + reason : "[Rejected by " + approverEmail + "]: " + reason);
        }
        
        expense = expenseRepository.save(expense);
        log.info("[ExpenseService] Expense {} rejected by {}", expenseId, approverEmail);
        
        return toView(expense);
    }
    
    /**
     * Check if a user can view a specific expense based on role hierarchy
     */
    public boolean canViewExpense(User viewer, Expense expense) {
        // Owner can always view
        if (expense.getUser().getId().equals(viewer.getId())) {
            return true;
        }
        
        // SUPER_ADMIN can view all
        if (viewer.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return true;
        }
        
        // For company expenses, check role-based access
        if (expense.getCompanyId() != null) {
            com.expenseapp.company.Company company = companyRepository.findById(expense.getCompanyId()).orElse(null);
            if (company == null) return false;
            
            java.util.Optional<com.expenseapp.company.CompanyMember> memberOpt = 
                companyMemberRepository.findByCompanyAndUser(company, viewer);
            
            if (memberOpt.isEmpty()) return false;
            
            String viewerRole = memberOpt.get().getRole();
            
            // ADMIN can view all company expenses
            if ("ADMIN".equals(viewerRole)) {
                return true;
            }
            
            // MANAGER can view employee expenses
            if ("MANAGER".equals(viewerRole)) {
                // Check if expense owner is an employee
                java.util.Optional<com.expenseapp.company.CompanyMember> ownerMemberOpt = 
                    companyMemberRepository.findByCompanyAndUser(company, expense.getUser());
                
                if (ownerMemberOpt.isPresent() && "EMPLOYEE".equals(ownerMemberOpt.get().getRole())) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check if a user can approve reimbursement for a specific expense
     */
    public boolean canApproveReimbursement(User approver, Expense expense) {
        // Owner cannot approve their own
        if (expense.getUser().getId().equals(approver.getId())) {
            return false;
        }
        
        // SUPER_ADMIN can approve all
        if (approver.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return true;
        }
        
        // For company expenses, check role-based approval
        if (expense.getCompanyId() != null) {
            com.expenseapp.company.Company company = companyRepository.findById(expense.getCompanyId()).orElse(null);
            if (company == null) return false;
            
            java.util.Optional<com.expenseapp.company.CompanyMember> approverMemberOpt = 
                companyMemberRepository.findByCompanyAndUser(company, approver);
            
            if (approverMemberOpt.isEmpty()) return false;
            
            String approverRole = approverMemberOpt.get().getRole();
            
            // ADMIN can approve all reimbursements
            if ("ADMIN".equals(approverRole)) {
                return true;
            }
            
            // MANAGER can approve employee reimbursements only
            if ("MANAGER".equals(approverRole)) {
                java.util.Optional<com.expenseapp.company.CompanyMember> ownerMemberOpt = 
                    companyMemberRepository.findByCompanyAndUser(company, expense.getUser());
                
                if (ownerMemberOpt.isPresent() && "EMPLOYEE".equals(ownerMemberOpt.get().getRole())) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
