package com.example.demo.service;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.mail.from-name:TUBA MART}")
    private String mailFromName;

    public boolean isConfigured() {
        return mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank();
    }

    public boolean sendHtmlMail(String to, String subject, String htmlBody) {
        if (!isConfigured()) {
            log.warn("Gmail SMTP chưa được cấu hình, bỏ qua gửi email tới {}", to);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String fromAddress = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : mailUsername;
            helper.setFrom(new InternetAddress(fromAddress, mailFromName));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("Không thể gửi email đặt lại mật khẩu tới {} - Lỗi: {}", to, ex.getMessage(), ex);
            try {
                java.nio.file.Files.writeString(java.nio.file.Paths.get("/tmp/mail_error.txt"), ex.toString() + "\n" + ex.getMessage());
            } catch (Exception ignored) {}
            return false;
        }
    }
}
