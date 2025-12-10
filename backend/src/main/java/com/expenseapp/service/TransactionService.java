package com.expenseapp.service;

import com.expenseapp.dto.TransactionDto;
import com.expenseapp.exception.ResourceNotFoundException;
import com.expenseapp.model.Transaction;
import com.expenseapp.repository.TransactionRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final ModelMapper modelMapper;

    @Autowired
    public TransactionService(TransactionRepository transactionRepository, ModelMapper modelMapper) {
        this.transactionRepository = transactionRepository;
        this.modelMapper = modelMapper;
    }

    public List<TransactionDto> getAllTransactions(Long userId) {
        return transactionRepository.findByUserId(userId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public TransactionDto getTransactionById(Long id, Long userId) {
        Transaction transaction = transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        return convertToDto(transaction);
    }

    public List<TransactionDto> getTransactionsByDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        return transactionRepository.findByUserIdAndTransactionDateBetween(userId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public TransactionDto createTransaction(TransactionDto transactionDto, Long userId) {
        Transaction transaction = convertToEntity(transactionDto);
        transaction.setUserId(userId);
        // DTO has OffsetDateTime; map to entity LocalDateTime
        if (transactionDto.getTransactionDate() != null) {
            transaction.setTransactionDate(transactionDto.getTransactionDate().toLocalDateTime());
        }
        Transaction savedTransaction = transactionRepository.save(transaction);
        return convertToDto(savedTransaction);
    }

    public TransactionDto updateTransaction(Long id, TransactionDto transactionDto, Long userId) {
        Transaction existingTransaction = transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        // Partial update: only overwrite fields that are provided (non-null)
        if (transactionDto.getDescription() != null) {
            existingTransaction.setDescription(transactionDto.getDescription());
        }
        if (transactionDto.getAmount() != null) {
            existingTransaction.setAmount(transactionDto.getAmount());
        }
        if (transactionDto.getType() != null) {
            existingTransaction.setType(transactionDto.getType());
        }
        if (transactionDto.getCategory() != null) {
            existingTransaction.setCategory(transactionDto.getCategory());
        }
        if (transactionDto.getTransactionDate() != null) {
            existingTransaction.setTransactionDate(transactionDto.getTransactionDate().toLocalDateTime());
        }
        if (transactionDto.getNotes() != null) {
            existingTransaction.setNotes(transactionDto.getNotes());
        }

        Transaction updatedTransaction = transactionRepository.save(existingTransaction);
        return convertToDto(updatedTransaction);
    }

    public void deleteTransaction(Long id, Long userId) {
        Transaction transaction = transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        transactionRepository.delete(transaction);
    }

    private TransactionDto convertToDto(Transaction transaction) {
        TransactionDto dto = modelMapper.map(transaction, TransactionDto.class);
        if (transaction.getTransactionDate() != null) {
            dto.setTransactionDate(transaction.getTransactionDate().atOffset(ZoneOffset.UTC));
        }
        return dto;
    }

    private Transaction convertToEntity(TransactionDto transactionDto) {
        return modelMapper.map(transactionDto, Transaction.class);
    }
}
