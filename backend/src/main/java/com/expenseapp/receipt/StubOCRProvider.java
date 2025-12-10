package com.expenseapp.receipt;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Lazy;

@Service
@ConditionalOnProperty(prefix = "ocr", name = "provider", havingValue = "stub", matchIfMissing = true)
public class StubOCRProvider implements OCRProvider {

    private final OCRJobRepository ocrJobRepository;
    private final ReceiptService receiptService;

    public StubOCRProvider(OCRJobRepository ocrJobRepository, @Lazy ReceiptService receiptService) {
        this.ocrJobRepository = ocrJobRepository;
        this.receiptService = receiptService;
    }

    @Override
    @Async
    public void processAsync(Long jobId) {
        try {
            OCRJob job = ocrJobRepository.findById(jobId).orElseThrow();
            job.setStatus("RUNNING");
            ocrJobRepository.save(job);

            // Simulate latency
            Thread.sleep(500);

            // Produce a simple extracted JSON
            String extracted = "{\"confidence\":0.7,\"fields\":{\"merchant\":\"Unknown\",\"amount\":null,\"date\":null}}";
            receiptService.completeJob(jobId, extracted, null);
        } catch (Exception ex) {
            receiptService.completeJob(jobId, null, ex.getMessage());
        }
    }
}
