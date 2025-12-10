package com.expenseapp.split;

import com.expenseapp.split.dto.SplitRequest;
import com.expenseapp.split.dto.SplitResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/split")
public class SplitController {

    private final SplitService splitService;

    public SplitController(SplitService splitService) {
        this.splitService = splitService;
    }

    @PostMapping("/simulate")
    public ResponseEntity<SplitResponse> simulate(@Valid @RequestBody SplitRequest request) {
        return ResponseEntity.ok(splitService.simulate(request));
    }
}
