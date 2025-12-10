package com.expenseapp.email;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class EtherealEmailConfig {

    /**
     * Configure a test SMTP server that works without credentials
     * Uses Ethereal.email - a fake SMTP service for testing
     */
    @Bean
    @Profile("!production")
    public JavaMailSender testMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        
        // Use Ethereal.email test SMTP server
        mailSender.setHost("smtp.ethereal.email");
        mailSender.setPort(587);
        
        // Test credentials (public test account)
        mailSender.setUsername("test@ethereal.email");
        mailSender.setPassword("test");
        
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");
        
        return mailSender;
    }
}
