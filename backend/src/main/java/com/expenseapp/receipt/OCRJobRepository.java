package com.expenseapp.receipt;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OCRJobRepository extends JpaRepository<OCRJob, Long> {
}
