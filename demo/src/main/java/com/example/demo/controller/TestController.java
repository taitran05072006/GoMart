package com.example.demo.controller;
import com.example.demo.service.MailService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class TestController {
    private final MailService mailService;
    public TestController(MailService mailService) { this.mailService = mailService; }
    @GetMapping("/api/test-mail-config")
    public String test() {
        return "Configured: " + mailService.isConfigured();
    }
}
