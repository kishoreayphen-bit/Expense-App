package com.expenseapp.bill;

import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillService {
    
    private final BillRepository billRepository;
    private final UserRepository userRepository;
    
    private static final String UPLOAD_DIR = "bills";
    
    @Transactional
    public Bill uploadBill(String userEmail, MultipartFile file, BillUploadRequest request, Long companyId) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
                : "";
            String uniqueFilename = UUID.randomUUID().toString() + extension;
            
            // Check for duplicate bill number
            if (request.getBillNumber() != null && !request.getBillNumber().trim().isEmpty()) {
                List<Bill> existingBills = billRepository.findByUserIdAndBillNumber(user.getId(), request.getBillNumber().trim());
                // Filter by company context
                boolean hasDuplicate = existingBills.stream()
                    .anyMatch(b -> {
                        if (companyId == null) {
                            return b.getCompanyId() == null; // Personal mode - check personal bills
                        } else {
                            return companyId.equals(b.getCompanyId()); // Company mode - check company bills
                        }
                    });
                
                if (hasDuplicate) {
                    throw new IllegalArgumentException("Bill number '" + request.getBillNumber().trim() + "' already exists. Please use a different bill number.");
                }
            }
            
            // Save file
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Create bill record
            Bill bill = new Bill();
            bill.setUserId(user.getId());
            bill.setCompanyId(companyId);
            bill.setBillNumber(request.getBillNumber());
            bill.setExpenseId(request.getExpenseId());
            bill.setFileName(originalFilename);
            bill.setFilePath(filePath.toString());
            bill.setFileSize(file.getSize());
            bill.setMimeType(file.getContentType());
            bill.setCategoryId(request.getCategoryId());
            bill.setMerchant(request.getMerchant());
            bill.setAmount(request.getAmount());
            bill.setCurrency(request.getCurrency());
            bill.setBillDate(request.getBillDate());
            bill.setNotes(request.getNotes());
            
            return billRepository.save(bill);
            
        } catch (IOException e) {
            log.error("Failed to upload bill", e);
            throw new RuntimeException("Failed to upload bill: " + e.getMessage());
        }
    }
    
    public List<Bill> listBills(String userEmail, Long companyId) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (companyId != null && companyId > 0) {
            return billRepository.findByUserIdAndCompanyId(user.getId(), companyId);
        }
        return billRepository.findByUserIdAndCompanyIdIsNull(user.getId());
    }
    
    public List<Bill> searchBills(String userEmail, Long companyId, String billNumber, 
                                  String merchant, Long categoryId, LocalDate startDate, LocalDate endDate) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return billRepository.searchBills(user.getId(), companyId, billNumber, merchant, 
                                         categoryId, startDate, endDate);
    }
    
    public Bill getBill(Long id, String userEmail) {
        var user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bill not found"));
        
        if (!bill.getUserId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        return bill;
    }
    
    @Transactional
    public void deleteBill(Long id, String userEmail) {
        Bill bill = getBill(id, userEmail);
        
        // Delete file
        try {
            Files.deleteIfExists(Paths.get(bill.getFilePath()));
        } catch (IOException e) {
            log.error("Failed to delete bill file", e);
        }
        
        billRepository.delete(bill);
    }
    
    public byte[] getBillFile(Long id, String userEmail) throws IOException {
        Bill bill = getBill(id, userEmail);
        return Files.readAllBytes(Paths.get(bill.getFilePath()));
    }
}
