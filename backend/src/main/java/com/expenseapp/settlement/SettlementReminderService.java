package com.expenseapp.settlement;

import com.expenseapp.settlement.dto.SettlementReminderDto;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SettlementReminderService {

    private final SettlementReminderRepository reminderRepository;
    private final UserRepository userRepository;

    public SettlementReminderService(SettlementReminderRepository reminderRepository, UserRepository userRepository) {
        this.reminderRepository = reminderRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SettlementReminderDto create(String email, SettlementReminderDto dto) {
        User user = userRepository.findByEmail(email).orElseThrow();
        User counterparty = userRepository.findById(dto.getCounterpartyId()).orElseThrow();
        SettlementReminder r = new SettlementReminder();
        r.setUser(user);
        r.setCounterparty(counterparty);
        r.setMinAmount(dto.getMinAmount());
        r.setDueDate(dto.getDueDate());
        if (dto.getChannel() != null) r.setChannel(dto.getChannel());
        r = reminderRepository.save(r);
        return new SettlementReminderDto(r.getId(), counterparty.getId(), r.getMinAmount(), r.getDueDate(), r.getChannel());
    }

    @Transactional(readOnly = true)
    public List<SettlementReminderDto> list(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return reminderRepository.findAllByUser(user).stream()
                .map(r -> new SettlementReminderDto(r.getId(), r.getCounterparty().getId(), r.getMinAmount(), r.getDueDate(), r.getChannel()))
                .toList();
    }
}
