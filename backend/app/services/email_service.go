package services

import (
	"fmt"
	"log"
	"movie-app/config"
	"net/smtp"
	"strings"
)

type EmailService struct {
	cfg config.Config
}

func NewEmailService(cfg config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) SendVerificationEmail(toEmail, firstName, verifyURL string) error {
	subject := "Verify your email address"
	greeting := "Hi"
	if strings.TrimSpace(firstName) != "" {
		greeting = fmt.Sprintf("Hi %s", strings.TrimSpace(firstName))
	}

	body := fmt.Sprintf(
		"%s,\r\n\r\nPlease verify your email address by clicking the link below:\r\n%s\r\n\r\nThis link expires in %d hours.\r\nIf you did not create an account, you can safely ignore this email.\r\n",
		greeting,
		verifyURL,
		s.cfg.EmailVerificationExpiryHours,
	)

	if strings.TrimSpace(s.cfg.SMTPHost) == "" {
		log.Printf("[DEV EMAIL] To: %s | Subject: %s | Verify URL: %s", toEmail, subject, verifyURL)
		return nil
	}

	return s.sendPlainEmail(toEmail, subject, body)
}

func (s *EmailService) SendPasswordResetEmail(toEmail, firstName, resetURL string) error {
	subject := "Reset your password"
	greeting := "Hi"
	if strings.TrimSpace(firstName) != "" {
		greeting = fmt.Sprintf("Hi %s", strings.TrimSpace(firstName))
	}

	body := fmt.Sprintf(
		"%s,\r\n\r\nWe received a request to reset your password. Click the link below to choose a new password:\r\n%s\r\n\r\nThis link expires in %d minutes.\r\nIf you did not request a password reset, you can safely ignore this email.\r\n",
		greeting,
		resetURL,
		s.cfg.PasswordResetExpiryMinutes,
	)

	if strings.TrimSpace(s.cfg.SMTPHost) == "" {
		log.Printf("[DEV EMAIL] To: %s | Subject: %s | Reset URL: %s", toEmail, subject, resetURL)
		return nil
	}

	return s.sendPlainEmail(toEmail, subject, body)
}

func (s *EmailService) sendPlainEmail(toEmail, subject, body string) error {
	from := s.cfg.SMTPFromEmail
	if from == "" {
		from = s.cfg.SMTPUsername
	}

	msg := strings.Join([]string{
		fmt.Sprintf("From: %s <%s>", s.cfg.SMTPFromName, from),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"UTF-8\"",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
	var auth smtp.Auth
	if s.cfg.SMTPUsername != "" && s.cfg.SMTPPassword != "" {
		auth = smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	}

	return smtp.SendMail(addr, auth, from, []string{toEmail}, []byte(msg))
}
