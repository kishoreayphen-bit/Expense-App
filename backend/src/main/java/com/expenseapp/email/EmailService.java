package com.expenseapp.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.email.from:noreply@expenseapp.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:19006}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendCompanyInvitation(String toEmail, String companyName, String inviterName, String role, Long invitationId) {
        try {
            String htmlContent = buildInvitationEmail(companyName, inviterName, role, invitationId);
            
            // Log email details
            log.info("=".repeat(80));
            log.info("📧 SENDING INVITATION EMAIL");
            log.info("To: {}", toEmail);
            log.info("Subject: You're invited to join {}", companyName);
            log.info("Company: {}", companyName);
            log.info("Role: {}", role);
            log.info("Invited by: {}", inviterName);
            log.info("=".repeat(80));
            
            // Send real email
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("You're invited to join " + companyName);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            
            log.info("✅ Email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send invitation email to {}: {}", toEmail, e.getMessage());
            log.error("Please configure SMTP credentials in .env file");
            throw new RuntimeException("Failed to send invitation email. Please configure SMTP settings.", e);
        }
    }
    
    private boolean isSmtpConfigured() {
        try {
            return mailSender != null && !fromEmail.equals("noreply@expenseapp.com");
        } catch (Exception e) {
            return false;
        }
    }

    public void sendInvitationAcceptedNotification(String toEmail, String userName, String companyName) {
        try {
            String htmlContent = buildAcceptedEmail(userName, companyName);
            
            // Log email details
            log.info("=".repeat(80));
            log.info("✅ SENDING ACCEPTANCE EMAIL");
            log.info("To: {}", toEmail);
            log.info("Subject: {} accepted your invitation", userName);
            log.info("User: {}", userName);
            log.info("Company: {}", companyName);
            log.info("=".repeat(80));
            
            // Send real email
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(userName + " accepted your invitation");
            helper.setText(htmlContent, true);
            mailSender.send(message);
            
            log.info("✅ Email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send acceptance email: {}", e.getMessage());
        }
    }

    public void sendInvitationDeclinedNotification(String toEmail, String userName, String companyName, String reason) {
        try {
            String htmlContent = buildDeclinedEmail(userName, companyName, reason);
            
            // Log email details
            log.info("=".repeat(80));
            log.info("❌ SENDING DECLINED EMAIL");
            log.info("To: {}", toEmail);
            log.info("Subject: {} declined your invitation", userName);
            log.info("User: {}", userName);
            log.info("Company: {}", companyName);
            log.info("Reason: {}", reason != null ? reason : "No reason provided");
            log.info("=".repeat(80));
            
            // Send real email
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(userName + " declined your invitation");
            helper.setText(htmlContent, true);
            mailSender.send(message);
            
            log.info("✅ Email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send declined email: {}", e.getMessage());
        }
    }

    private String buildInvitationEmail(String companyName, String inviterName, String role, Long invitationId) {
        String invitationUrl = frontendUrl + "/invitation/" + invitationId;
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    .header { background: linear-gradient(135deg, #7C3AED 0%%, #5B21B6 100%%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
                    .content { padding: 40px 30px; }
                    .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
                    .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
                    .invitation-box { background-color: #f9fafb; border-left: 4px solid #7C3AED; padding: 20px; margin: 30px 0; border-radius: 8px; }
                    .invitation-box .label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
                    .invitation-box .value { font-size: 18px; color: #1f2937; font-weight: 600; }
                    .button-container { text-align: center; margin: 40px 0; }
                    .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7C3AED 0%%, #5B21B6 100%%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3); transition: transform 0.2s; }
                    .button:hover { transform: translateY(-2px); }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
                    .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
                    .divider { height: 1px; background-color: #e5e7eb; margin: 30px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 You're Invited!</h1>
                    </div>
                    <div class="content">
                        <p class="greeting">Hello!</p>
                        <p class="message">
                            <strong>%s</strong> has invited you to join <strong>%s</strong> as a <strong>%s</strong>.
                        </p>
                        <div class="invitation-box">
                            <div class="label">Company</div>
                            <div class="value">%s</div>
                            <div class="divider"></div>
                            <div class="label">Role</div>
                            <div class="value">%s</div>
                            <div class="divider"></div>
                            <div class="label">Invited by</div>
                            <div class="value">%s</div>
                        </div>
                        <p class="message">
                            Click the button below to open the Expense App and accept or decline this invitation.
                        </p>
                        <div class="button-container">
                            <a href="%s" class="button">View Invitation</a>
                        </div>
                        <p class="message" style="font-size: 14px; color: #6b7280;">
                            If you don't have the Expense App installed, please download it first and then open this link.
                        </p>
                    </div>
                    <div class="footer">
                        <p><strong>Expense App</strong></p>
                        <p>Manage your expenses efficiently</p>
                        <p style="margin-top: 20px; font-size: 12px;">
                            This is an automated email. Please do not reply to this message.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """, inviterName, companyName, role, companyName, role, inviterName, invitationUrl);
    }

    private String buildAcceptedEmail(String userName, String companyName) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
                    .content { padding: 40px 30px; }
                    .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; }
                    .highlight-box { background-color: #d1fae5; border-left: 4px solid #10B981; padding: 20px; margin: 30px 0; border-radius: 8px; }
                    .highlight-box .value { font-size: 18px; color: #065f46; font-weight: 600; }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
                    .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Invitation Accepted!</h1>
                    </div>
                    <div class="content">
                        <p class="message">
                            Great news! <strong>%s</strong> has accepted your invitation to join <strong>%s</strong>.
                        </p>
                        <div class="highlight-box">
                            <div class="value">%s is now a member of your company!</div>
                        </div>
                        <p class="message">
                            You can now collaborate with them on expenses, budgets, and more.
                        </p>
                    </div>
                    <div class="footer">
                        <p><strong>Expense App</strong></p>
                        <p>Manage your expenses efficiently</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, companyName, userName);
    }

    private String buildDeclinedEmail(String userName, String companyName, String reason) {
        String reasonText = (reason != null && !reason.isEmpty()) 
            ? "<p class=\"message\"><strong>Reason:</strong> " + reason + "</p>" 
            : "";
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                    .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
                    .content { padding: 40px 30px; }
                    .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; }
                    .highlight-box { background-color: #fee2e2; border-left: 4px solid #EF4444; padding: 20px; margin: 30px 0; border-radius: 8px; }
                    .highlight-box .value { font-size: 18px; color: #991b1b; font-weight: 600; }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
                    .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Invitation Declined</h1>
                    </div>
                    <div class="content">
                        <p class="message">
                            <strong>%s</strong> has declined your invitation to join <strong>%s</strong>.
                        </p>
                        %s
                        <div class="highlight-box">
                            <div class="value">The invitation has been removed.</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>Expense App</strong></p>
                        <p>Manage your expenses efficiently</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, companyName, reasonText);
    }
}
