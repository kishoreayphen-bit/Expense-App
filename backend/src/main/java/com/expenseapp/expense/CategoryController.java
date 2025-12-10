package com.expenseapp.expense;

import com.expenseapp.expense.dto.CategoryRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/expense/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public ResponseEntity<List<Category>> listCategories(
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        // Return global categories + company-specific categories
        List<Category> categories;
        if (normalizedCompanyId == null) {
            // Personal mode: only global categories
            categories = categoryRepository.findByCompanyIdIsNull();
        } else {
            // Company mode: global + company-specific
            categories = categoryRepository.findByCompanyIdIsNullOrCompanyId(normalizedCompanyId);
        }
        return ResponseEntity.ok(categories);
    }
    
    @PostMapping
    public ResponseEntity<Category> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        
        // Check if category with same name already exists in this scope
        if (categoryRepository.existsByName(request.getName())) {
            return ResponseEntity.badRequest().build();
        }
        
        Category category = new Category();
        category.setName(request.getName());
        category.setCompanyId(normalizedCompanyId);
        
        // Set parent category if provided
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                .orElseThrow(() -> new IllegalArgumentException("Parent category not found"));
            category.setParent(parent);
        }
        
        Category savedCategory = categoryRepository.save(category);
        
        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(savedCategory.getId())
            .toUri();
            
        return ResponseEntity.created(location).body(savedCategory);
    }
}
