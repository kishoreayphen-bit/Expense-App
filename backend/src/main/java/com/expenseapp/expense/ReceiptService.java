package com.expenseapp.expense;

import com.expenseapp.expense.dto.ReceiptView;
import com.expenseapp.receipt.Receipt;
import com.expenseapp.receipt.ReceiptRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import java.time.format.DateTimeFormatter;

// Disabled legacy bean to avoid conflicts with com.expenseapp.receipt.ReceiptService
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final UserRepository userRepository;

    public ReceiptService(ReceiptRepository receiptRepository, UserRepository userRepository) {
        this.receiptRepository = receiptRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ReceiptView processOcr(String email, Long receiptId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Receipt receipt = receiptRepository.findById(receiptId).orElseThrow();
        if (!receipt.getExpense().getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Not found");
        }
        // Stub OCR: build a minimal JSON with known expense fields
        var e = receipt.getExpense();
        String json = "{"
                + "\"merchant\":\"" + (e.getMerchant() != null ? e.getMerchant() : "") + "\"," 
                + "\"amount\":" + e.getAmount() + ","
                + "\"currency\":\"" + e.getCurrency() + "\"," 
                + "\"date\":\"" + e.getOccurredOn().format(DateTimeFormatter.ISO_DATE) + "\""
                + "}";
        receipt.setStatus("COMPLETED");
        receipt.setExtractedJson(json);
        return new ReceiptView(receipt.getId(), receipt.getFileName(), receipt.getStatus(), receipt.getCreatedAt(), receipt.getExtractedJson());
    }

    @Transactional(readOnly = true)
    public ReceiptView getReceipt(String email, Long receiptId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) throw new IllegalArgumentException("Not found");
        return new ReceiptView(r.getId(), r.getFileName(), r.getStatus(), r.getCreatedAt(), r.getExtractedJson());
    }
}
