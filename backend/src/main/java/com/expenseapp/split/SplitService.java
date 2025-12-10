package com.expenseapp.split;

import com.expenseapp.fx.FXService;
import com.expenseapp.split.dto.SplitRequest;
import com.expenseapp.split.dto.SplitResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class SplitService {
    private final FXService fxService;

    public SplitService(FXService fxService) {
        this.fxService = fxService;
    }

    public SplitResponse simulate(SplitRequest req) {
        String type = req.getType().toUpperCase();
        BigDecimal total = req.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
        String currency = req.getCurrency();
        java.time.LocalDate date = req.getOccurredOn() != null ? req.getOccurredOn() : java.time.LocalDate.now();
        BigDecimal rate = fxService.rateFor(date, currency);
        BigDecimal baseTotal = total.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        String baseCurrency = fxService.getBaseCurrency();
        List<SplitResponse.Share> shares = new ArrayList<>();

        // 1) Pre-allocate fixed amounts and exclude flagged participants from base distribution
        BigDecimal preAllocated = BigDecimal.ZERO;
        for (var p : req.getParticipants()) {
            BigDecimal fixed = safe(p.getFixedAmount());
            if (fixed.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal cappedFixed = applyCapIfAny(p, fixed);
                shares.add(new SplitResponse.Share(p.getUserId(), cappedFixed,
                        cappedFixed.multiply(rate).setScale(2, RoundingMode.HALF_UP)));
                preAllocated = preAllocated.add(cappedFixed);
            } else {
                BigDecimal zero = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                shares.add(new SplitResponse.Share(p.getUserId(), zero, zero));
            }
        }
        if (preAllocated.compareTo(total) > 0) {
            throw new IllegalArgumentException("Fixed amounts exceed total");
        }
        BigDecimal remaining = total.subtract(preAllocated);

        // 2) Build list of eligible participants (not excluded) for base distribution
        List<Integer> eligibleIdx = new ArrayList<>();
        for (int i = 0; i < req.getParticipants().size(); i++) {
            var p = req.getParticipants().get(i);
            if (Boolean.TRUE.equals(p.getExcluded())) continue;
            // If participant already fully capped by fixed, skip if cap hit
            BigDecimal cap = safe(p.getCapAmount());
            if (cap.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal already = shares.get(i).getAmount();
                if (already.compareTo(cap) >= 0) continue;
            }
            eligibleIdx.add(i);
        }

        if (!eligibleIdx.isEmpty() && remaining.compareTo(BigDecimal.ZERO) > 0) {
            // 3) Distribute remaining by type with iterative cap enforcement
            distributeWithCaps(req, type, shares, eligibleIdx, remaining, rate);
        }

        // 4) Final rounding adjustment to match total exactly
        adjustRounding(total, shares, rate);
        return new SplitResponse(total, shares, baseTotal, baseCurrency);
    }

    private void distributeWithCaps(SplitRequest req, String type, List<SplitResponse.Share> shares,
                                    List<Integer> eligibleIdx, BigDecimal remaining, BigDecimal rate) {
        BigDecimal toDistribute = remaining;
        List<Integer> pool = new ArrayList<>(eligibleIdx);
        int guard = 0;
        while (toDistribute.compareTo(BigDecimal.ZERO) > 0 && !pool.isEmpty() && guard++ < 50) {
            // Compute weights
            BigDecimal weightSum = BigDecimal.ZERO;
            List<BigDecimal> weights = new ArrayList<>();
            for (int idx : pool) {
                var p = req.getParticipants().get(idx);
                BigDecimal w = switch (type) {
                    case "EQUAL" -> BigDecimal.ONE;
                    case "RATIO" -> safe(p.getRatio());
                    case "PERCENTAGE" -> safe(p.getPercentage());
                    default -> throw new IllegalArgumentException("Unsupported split type: " + type);
                };
                weights.add(w);
                weightSum = weightSum.add(w);
            }
            if (weightSum.compareTo(BigDecimal.ZERO) == 0) {
                // If no weights, split equally
                weights.replaceAll(w -> BigDecimal.ONE);
                weightSum = BigDecimal.valueOf(weights.size());
            }

            // Provisional allocation
            BigDecimal allocatedThisRound = BigDecimal.ZERO;
            List<BigDecimal> provisional = new ArrayList<>();
            for (int i = 0; i < pool.size(); i++) {
                BigDecimal part = toDistribute.multiply(weights.get(i)).divide(weightSum, 2, RoundingMode.HALF_UP);
                provisional.add(part);
                allocatedThisRound = allocatedThisRound.add(part);
            }
            // Adjust last to ensure we allocate exactly toDistribute
            if (!provisional.isEmpty()) {
                BigDecimal diff = toDistribute.subtract(allocatedThisRound);
                provisional.set(provisional.size() - 1, provisional.get(provisional.size() - 1).add(diff));
            }

            // Apply caps; collect overflow to re-distribute
            BigDecimal overflow = BigDecimal.ZERO;
            List<Integer> nextPool = new ArrayList<>();
            for (int i = 0; i < pool.size(); i++) {
                int idx = pool.get(i);
                var p = req.getParticipants().get(idx);
                BigDecimal cap = safe(p.getCapAmount());
                BigDecimal add = provisional.get(i);
                BigDecimal current = shares.get(idx).getAmount();
                if (cap.compareTo(BigDecimal.ZERO) > 0 && current.add(add).compareTo(cap) > 0) {
                    BigDecimal allowed = cap.subtract(current);
                    if (allowed.compareTo(BigDecimal.ZERO) < 0) allowed = BigDecimal.ZERO;
                    BigDecimal newAmt = current.add(allowed);
                    shares.set(idx, new SplitResponse.Share(p.getUserId(), newAmt,
                            newAmt.multiply(rate).setScale(2, RoundingMode.HALF_UP)));
                    overflow = overflow.add(add.subtract(allowed));
                    // capped out; exclude from next pool
                } else {
                    BigDecimal newAmt = current.add(add);
                    shares.set(idx, new SplitResponse.Share(p.getUserId(), newAmt,
                            newAmt.multiply(rate).setScale(2, RoundingMode.HALF_UP)));
                    nextPool.add(idx);
                }
            }
            toDistribute = overflow;
            pool = nextPool;
        }
    }

    private void adjustRounding(BigDecimal total, List<SplitResponse.Share> shares, BigDecimal rate) {
        BigDecimal sum = shares.stream().map(SplitResponse.Share::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal diff = total.subtract(sum);
        if (diff.compareTo(BigDecimal.ZERO) != 0 && !shares.isEmpty()) {
            // Adjust the last user's share by the rounding difference
            SplitResponse.Share last = shares.get(shares.size() - 1);
            BigDecimal fixed = last.getAmount().add(diff);
            shares.set(shares.size() - 1, new SplitResponse.Share(last.getUserId(), fixed,
                    fixed.multiply(rate).setScale(2, RoundingMode.HALF_UP)));
        }
    }

    private BigDecimal safe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : v.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal applyCapIfAny(SplitRequest.Participant p, BigDecimal amount) {
        BigDecimal cap = safe(p.getCapAmount());
        if (cap.compareTo(BigDecimal.ZERO) > 0 && amount.compareTo(cap) > 0) {
            return cap;
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
