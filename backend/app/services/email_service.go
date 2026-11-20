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

	// Dev fallback when SMTP_HOST is not configured
	if strings.TrimSpace(s.cfg.SMTPHost) == "" {
		log.Printf("[DEV EMAIL] To: %s | Subject: %s | Verify URL: %s", toEmail, subject, verifyURL)
		return nil
	}

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
