package com.expenseapp.receipt;

import com.expenseapp.expense.Expense;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.notification.NotificationPublisher;
import com.expenseapp.acl.ACLEntryService;
import com.expenseapp.audit.AccessLogService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Lazy;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service("receiptApiService")
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final OCRJobRepository ocrJobRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final OCRProvider ocrProvider;
    private final ReceiptPageRepository receiptPageRepository;
    private final ACLEntryService aclService;
    private final AccessLogService accessLogService;

    public ReceiptService(ReceiptRepository receiptRepository,
                          OCRJobRepository ocrJobRepository,
                          ExpenseRepository expenseRepository,
                          UserRepository userRepository,
                          NotificationPublisher notificationPublisher,
                          @Lazy OCRProvider ocrProvider,
                          ReceiptPageRepository receiptPageRepository,
                          ACLEntryService aclService,
                          AccessLogService accessLogService) {
        this.receiptRepository = receiptRepository;
        this.ocrJobRepository = ocrJobRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.notificationPublisher = notificationPublisher;
        this.ocrProvider = ocrProvider;
        this.receiptPageRepository = receiptPageRepository;
        this.aclService = aclService;
        this.accessLogService = accessLogService;
    }

    @Transactional
    public Receipt create(String userEmail, Long expenseId, String fileName, String contentType, Long fileSize) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Expense expense = expenseRepository.findById(expenseId).orElseThrow();
        if (!expense.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Cannot attach receipt to others' expense");
        }
        Receipt r = new Receipt();
        r.setExpense(expense);
        r.setFileName(fileName);
        r.setContentType(contentType);
        r.setFileSize(fileSize);
        r.setStatus("UPLOADED");
        return receiptRepository.save(r);
    }

    @Transactional(readOnly = true)
    public List<Receipt> listByExpense(String userEmail, Long expenseId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Expense expense = expenseRepository.findById(expenseId).orElseThrow();
        if (!expense.getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "EXPENSE", expenseId, "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_LIST_BY_EXPENSE", "EXPENSE", expenseId, "DENIED", null);
                throw new IllegalArgumentException("Cannot list receipts of others' expense");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_LIST_BY_EXPENSE", "EXPENSE", expenseId, "ALLOWED", null);
        }
        return receiptRepository.findAllByExpense(expense);
    }

    @Transactional(readOnly = true)
    public Receipt get(String userEmail, Long id) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(id).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "READ")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_GET", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Cannot view others' receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_GET", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        return r;
    }

    @Transactional
    public OCRJob startScan(String userEmail, Long receiptId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "WRITE")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "WRITE");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_SCAN", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Cannot scan others' receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_SCAN", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        // mark receipt as queued/processing
        r.setStatus("PROCESSING");
        r.setUpdatedAt(Instant.now());
        receiptRepository.save(r);

        OCRJob job = new OCRJob();
        job.setReceipt(r);
        job.setStatus("QUEUED");
        job = ocrJobRepository.save(job);

        // Hand off to provider asynchronously
        ocrProvider.processAsync(job.getId());
        return job;
    }

    @Transactional
    public void completeJob(Long jobId, String extractedJson, String errorMessage) {
        OCRJob job = ocrJobRepository.findById(jobId).orElseThrow();
        Receipt r = job.getReceipt();
        if (errorMessage == null) {
            r.setExtractedJson(extractedJson);
            r.setStatus("COMPLETED");
            r.setUpdatedAt(Instant.now());
            receiptRepository.save(r);

            job.setStatus("COMPLETED");
            job.setFinishedAt(Instant.now());
            ocrJobRepository.save(job);

            Long userId = r.getExpense().getUser().getId();
            notificationPublisher.publish(userId, "OCR_COMPLETE",
                    "Receipt Scan Complete", "Your receipt was processed.",
                    "{\"receiptId\":" + r.getId() + ",\"expenseId\":" + r.getExpense().getId() + "}");
        } else {
            r.setStatus("FAILED");
            r.setUpdatedAt(Instant.now());
            receiptRepository.save(r);

            job.setStatus("FAILED");
            job.setFinishedAt(Instant.now());
            job.setErrorMessage(errorMessage);
            ocrJobRepository.save(job);
        }
    }

    @Transactional
    public Receipt applyFields(String userEmail, Long receiptId, String merchant, java.math.BigDecimal amount, String dateIso) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        Expense e = r.getExpense();
        if (!e.getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "WRITE")
                    || aclService.hasAccess(user.getId(), "EXPENSE", e.getId(), "WRITE");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_APPLY_FIELDS", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Cannot apply to others' expense");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_APPLY_FIELDS", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        if (merchant != null && !merchant.isBlank()) {
            e.setMerchant(merchant);
        }
        if (amount != null) {
            e.setAmount(amount);
        }
        if (dateIso != null && !dateIso.isBlank()) {
            e.setOccurredOn(LocalDate.parse(dateIso));
        }
        // Touch updatedAt on receipt
        r.setUpdatedAt(Instant.now());
        return r;
    }

    @Transactional
    public ReceiptPage addPage(String userEmail, Long receiptId, String fileName, String contentType, Long fileSize) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "WRITE")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "WRITE");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_ADD_PAGE", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Cannot modify others' receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_ADD_PAGE", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        int nextPage = receiptPageRepository.findAllByReceiptOrderByPageNumber(r).stream()
                .mapToInt(ReceiptPage::getPageNumber).max().orElse(0) + 1;
        ReceiptPage page = new ReceiptPage();
        page.setReceipt(r);
        page.setPageNumber(nextPage);
        page.setFileName(fileName);
        page.setContentType(contentType);
        page.setFileSize(fileSize);
        return receiptPageRepository.save(page);
    }

    @Transactional(readOnly = true)
    public java.util.List<ReceiptPage> listPages(String userEmail, Long receiptId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "READ")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_LIST_PAGES", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Cannot view others' receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_LIST_PAGES", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        return receiptPageRepository.findAllByReceiptOrderByPageNumber(r);
    }

    @Transactional(readOnly = true)
    public com.expenseapp.receipt.dto.PresignResponse presignDownload(String userEmail, Long receiptId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "READ")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "READ");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_DOWNLOAD", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Not authorized to download this receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_DOWNLOAD", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        Instant expires = Instant.now().plusSeconds(300);
        String url = "https://example-download/presigned?receiptId=" + r.getId() + "&exp=" + expires.getEpochSecond();
        return new com.expenseapp.receipt.dto.PresignResponse(url, expires);
    }

    @Transactional(readOnly = true)
    public com.expenseapp.receipt.dto.PresignResponse presignUpload(String userEmail, Long receiptId, String fileName, String contentType, Long fileSize) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Receipt r = receiptRepository.findById(receiptId).orElseThrow();
        if (!r.getExpense().getUser().getId().equals(user.getId())) {
            boolean allowed = aclService.hasAccess(user.getId(), "RECEIPT", r.getId(), "WRITE")
                    || aclService.hasAccess(user.getId(), "EXPENSE", r.getExpense().getId(), "WRITE");
            if (!allowed) {
                accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_UPLOAD", "RECEIPT", r.getId(), "DENIED", null);
                throw new IllegalArgumentException("Not authorized to upload to this receipt");
            }
            accessLogService.log(user.getId(), user.getEmail(), "RECEIPT_UPLOAD", "RECEIPT", r.getId(), "ALLOWED", null);
        }
        Instant expires = Instant.now().plusSeconds(300);
        String url = "https://example-upload/presigned?receiptId=" + r.getId()
                + "&fileName=" + java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8)
                + "&ct=" + java.net.URLEncoder.encode(contentType == null ? "" : contentType, java.nio.charset.StandardCharsets.UTF_8)
                + "&size=" + (fileSize == null ? 0 : fileSize)
                + "&exp=" + expires.getEpochSecond();
        return new com.expenseapp.receipt.dto.PresignResponse(url, expires);
    }
}
