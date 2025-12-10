package com.expenseapp.receipt;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StreamUtils;
import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/receipts")
public class ReceiptParseController {

    // Very light-weight stub parser so mobile 'Scan & autofill' works.
    // In future, wire this to a real OCR service and persist receipts.

        @PostMapping(value = "/parse")
    public ResponseEntity<Map<String, Object>> parse(@RequestPart(value = "file", required = false) MultipartFile file,
                                                     HttpServletRequest request) {
        // Validate auth (avoid 500s on anonymous)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(error("Not authenticated"));
        }
        // Try to get current user (not strictly required for this stub)
        String email;
        try {
            Object principal = auth.getPrincipal();
            if (principal instanceof UserDetails) {
                email = ((UserDetails) principal).getUsername();
            } else if (principal instanceof String) {
                email = (String) principal;
            } else {
                email = auth.getName();
            }
        } catch (Exception e) {
            email = "unknown";
        }

        String ct = request.getContentType();
        // If multipart missing or file part null, try to read raw bytes as fallback
        byte[] bodyBytes = null;
        try {
            if (file == null || file.isEmpty()) {
                bodyBytes = StreamUtils.copyToByteArray(request.getInputStream());
            }
        } catch (Exception ignore) {}
        if ((file == null || file.isEmpty()) && (bodyBytes == null || bodyBytes.length == 0)) {
            return ResponseEntity.status(415).body(error("Unsupported or empty request body (Content-Type=" + ct + ")"));
        }

        // Naive extraction from filename as a placeholder implementation
        String name = (file != null && file.getOriginalFilename() != null)
                ? file.getOriginalFilename()
                : "receipt.jpg";
        Map<String, Object> out = new HashMap<>();

        // merchant guess: alphanumeric prefix before first space/underscore/dash
        String merchant = name.replaceAll("\\.[^.]+$", "");
        merchant = merchant.replace('_', ' ').replace('-', ' ');
        if (merchant.contains(" ")) {
            merchant = merchant.split(" ")[0];
        }
        if (merchant.length() > 40) merchant = merchant.substring(0, 40);
        out.put("merchant", merchant);

        // amount guess: first number like 123.45 in filename
        Pattern amtPat = Pattern.compile("(\\d+)([.,](\\d{2}))?");
        Matcher m = amtPat.matcher(name);
        if (m.find()) {
            try {
                String amtStr = m.group(0).replace(',', '.');
                BigDecimal bd = new BigDecimal(amtStr);
                out.put("amount", bd);
            } catch (Exception ignore) {}
        }

        // currency default
        out.put("currency", "INR");

        // date: today as default
        out.put("date", LocalDate.now().format(DateTimeFormatter.ISO_DATE));

        // Optional: categoryName undefined by default

        return ResponseEntity.ok(out);
    }

    private Map<String, Object> error(String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("message", msg);
        return m;
    }
}
