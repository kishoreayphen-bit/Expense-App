package com.expenseapp.settlement;

import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.settlement.dto.NetBalancesView;
import com.expenseapp.settlement.dto.SettlementInitiateResponse;
import com.expenseapp.storage.FileStorageService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class SettlementService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementReceiptRepository settlementReceiptRepository;
    private final FileStorageService fileStorageService;

    public SettlementService(ExpenseRepository expenseRepository,
                             UserRepository userRepository,
                             SettlementRepository settlementRepository,
                             SettlementReceiptRepository settlementReceiptRepository,
                             FileStorageService fileStorageService) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.settlementRepository = settlementRepository;
        this.settlementReceiptRepository = settlementReceiptRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public SettlementInitiateResponse initiate(String email, Long payeeId, java.math.BigDecimal amount, Long groupId, Long companyId) {
        // Create a pending settlement and return an external payment link (stubbed)
        Settlement s = create(email, payeeId, amount, groupId, companyId);
        String externalRef = java.util.UUID.randomUUID().toString();
        s.setExternalRef(externalRef);
        // In real life, redirectUrl would be provided by UPI/bank provider SDK/API
        String redirectUrl = "https://provider.example/pay?ref=" + externalRef;
        return new SettlementInitiateResponse(externalRef, redirectUrl);
    }

    @Transactional
    public void processWebhook(String externalRef, String status) {
        Settlement s = settlementRepository.findByExternalRef(externalRef)
                .orElseThrow(() -> new IllegalArgumentException("Unknown externalRef"));
        switch (status == null ? "" : status.toUpperCase()) {
            case "SUCCESS" -> {
                s.setStatus("CONFIRMED");
                s.setConfirmedAt(Instant.now());
            }
            case "FAILED", "CANCELLED" -> s.setStatus("CANCELLED");
            default -> throw new IllegalArgumentException("Unsupported status: " + status);
        }
    }

    @Transactional(readOnly = true)
    public NetBalancesView netBalances(String email, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Map<Long, BigDecimal> credits = new HashMap<>();
        Map<Long, BigDecimal> debits = new HashMap<>();
        // TODO: Filter pairwise credits/debits by companyId when available in ExpenseRepository
        for (Object[] row : expenseRepository.pairwiseCredits(user.getId())) {
            credits.put(((Number) row[0]).longValue(), (BigDecimal) row[1]);
        }
        for (Object[] row : expenseRepository.pairwiseDebits(user.getId())) {
            debits.put(((Number) row[0]).longValue(), (BigDecimal) row[1]);
        }
        // Subtract confirmed settlements (partial settlements) from pairwise nets
        Map<Long, BigDecimal> paid = new HashMap<>(); // amounts this user paid to others (reduces debit)
        Map<Long, BigDecimal> received = new HashMap<>(); // amounts this user received from others (reduces credit)
        for (Object[] row : settlementRepository.confirmedPaidByUser(user.getId())) {
            paid.put(((Number) row[0]).longValue(), (BigDecimal) row[1]);
        }
        for (Object[] row : settlementRepository.confirmedReceivedByUser(user.getId())) {
            received.put(((Number) row[0]).longValue(), (BigDecimal) row[1]);
        }
        Set<Long> ids = new HashSet<>();
        ids.addAll(credits.keySet());
        ids.addAll(debits.keySet());
        ids.addAll(paid.keySet());
        ids.addAll(received.keySet());
        List<NetBalancesView.Pair> pairs = new ArrayList<>();
        for (Long id : ids) {
            BigDecimal c = credits.getOrDefault(id, BigDecimal.ZERO)
                    .subtract(received.getOrDefault(id, BigDecimal.ZERO));
            BigDecimal d = debits.getOrDefault(id, BigDecimal.ZERO)
                    .subtract(paid.getOrDefault(id, BigDecimal.ZERO));
            pairs.add(new NetBalancesView.Pair(id, c, d, c.subtract(d)));
        }
        return new NetBalancesView(pairs);
    }

    @Transactional
    public Settlement create(String email, Long payeeId, BigDecimal amount, Long groupId, Long companyId) {
        User payer = userRepository.findByEmail(email).orElseThrow();
        User payee = userRepository.findById(payeeId).orElseThrow();
        Settlement s = new Settlement();
        s.setPayer(payer);
        s.setPayee(payee);
        s.setAmount(amount);
        s.setCompanyId(companyId);
        if (groupId != null) {
            // Defer group association for now (optional lookup), keeping null allowed
        }
        return settlementRepository.save(s);
    }

    @Transactional
    public Settlement confirm(String email, Long id, Long companyId) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Settlement s = settlementRepository.findById(id).orElseThrow();
        // Verify company context matches
        if (companyId == null && s.getCompanyId() != null) {
            throw new IllegalArgumentException("Cannot confirm company settlement in personal mode");
        }
        if (companyId != null && !companyId.equals(s.getCompanyId())) {
            throw new IllegalArgumentException("Settlement belongs to different company");
        }
        // Only payee (receiver) can confirm
        if (!s.getPayee().getId().equals(actor.getId())) throw new IllegalArgumentException("Only payee can confirm");
        s.setStatus("CONFIRMED");
        s.setConfirmedAt(Instant.now());
        return s;
    }

    @Transactional(readOnly = true)
    public List<Settlement> listMine(String email, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        List<Settlement> all = settlementRepository.findAllByPayerOrPayee(user, user);
        // Filter by company context
        return all.stream()
                .filter(s -> {
                    if (companyId == null) {
                        return s.getCompanyId() == null; // Personal mode: only personal settlements
                    } else {
                        return companyId.equals(s.getCompanyId()); // Company mode: only this company's settlements
                    }
                })
                .toList();
    }

    @Transactional
    public String uploadReceipt(String email, Long settlementId, MultipartFile file) throws IOException {
        User user = userRepository.findByEmail(email).orElseThrow();
        Settlement s = settlementRepository.findById(settlementId).orElseThrow();
        if (!s.getPayer().getId().equals(user.getId()) && !s.getPayee().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized");
        }
        String uri = fileStorageService.save("settlement-receipts/" + settlementId, file);
        SettlementReceipt r = new SettlementReceipt();
        r.setSettlement(s);
        r.setFileUri(uri);
        settlementReceiptRepository.save(r);
        return uri;
    }

    @Transactional(readOnly = true)
    public List<String> listReceipts(String email, Long settlementId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Settlement s = settlementRepository.findById(settlementId).orElseThrow();
        if (!s.getPayer().getId().equals(user.getId()) && !s.getPayee().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized");
        }
        return settlementReceiptRepository.findAllBySettlement(s).stream().map(SettlementReceipt::getFileUri).toList();
    }
}
