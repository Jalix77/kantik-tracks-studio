"""
Tests for Email Service - Payment Notifications
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.email import (
    EmailService,
    PaymentEmailTemplates,
    send_payment_submitted_email,
    send_payment_approved_email,
    send_payment_rejected_email
)


class TestPaymentEmailTemplates:
    """Test email template generation"""
    
    def test_payment_submitted_template(self):
        """Test payment submitted email template generation"""
        subject, html, plain = PaymentEmailTemplates.payment_submitted(
            user_email="test@example.com",
            plan_requested="STANDARD",
            provider="MONCASH",
            amount=500.0,
            currency="HTG",
            billing_month="2026-02",
            reference="REF123",
            base_url="https://test.com",
            support_email="support@test.com"
        )
        
        # Check subject is bilingual
        assert "Paiement reçu" in subject
        assert "Payment received" in subject
        
        # Check HTML contains key elements
        assert "Standard" in html
        assert "MonCash" in html
        assert "500" in html
        assert "HTG" in html
        assert "2026-02" in html
        assert "REF123" in html
        assert "https://test.com" in html
        assert "24" in html  # 24 hours
        
        # Check plain text contains key elements
        assert "Standard" in plain
        assert "REF123" in plain
    
    def test_payment_approved_template(self):
        """Test payment approved email template generation"""
        subject, html, plain = PaymentEmailTemplates.payment_approved(
            user_email="test@example.com",
            plan_name="TEAM",
            expires_at="2026-03-17T00:00:00+00:00",
            base_url="https://test.com",
            support_email="support@test.com"
        )
        
        # Check subject is bilingual
        assert "approuvé" in subject
        assert "approved" in subject
        
        # Check HTML contains key elements
        assert "Team" in html
        assert "Félicitations" in html
        assert "Congratulations" in html
        assert "/catalog" in html
        assert "/library" in html
        
        # Check plain text
        assert "Team" in plain
        assert "/catalog" in plain
    
    def test_payment_rejected_template_with_note(self):
        """Test payment rejected email template with admin note"""
        subject, html, plain = PaymentEmailTemplates.payment_rejected(
            user_email="test@example.com",
            plan_requested="STANDARD",
            rejection_note="Invalid reference number",
            base_url="https://test.com",
            support_email="support@test.com"
        )
        
        # Check subject is bilingual
        assert "rejeté" in subject
        assert "rejected" in subject
        
        # Check HTML contains rejection note
        assert "Invalid reference number" in html
        assert "Standard" in html
        assert "action requise" in html.lower()
        
        # Check plain text
        assert "Invalid reference number" in plain
    
    def test_payment_rejected_template_without_note(self):
        """Test payment rejected email template without admin note"""
        subject, html, plain = PaymentEmailTemplates.payment_rejected(
            user_email="test@example.com",
            plan_requested="TEAM",
            rejection_note=None,
            base_url="https://test.com",
            support_email="support@test.com"
        )
        
        # Should not have note box when no note
        assert "Note de l'administrateur" not in html or "Admin Note" not in html


class TestEmailService:
    """Test EmailService class"""
    
    def test_email_service_not_configured_without_api_key(self):
        """Test email service reports not configured without API key"""
        with patch.dict(os.environ, {'RESEND_API_KEY': ''}, clear=False):
            # Create new instance without API key
            service = EmailService()
            service.api_key = None
            service.client = None
            assert not service.is_configured()
    
    @pytest.mark.asyncio
    async def test_send_email_returns_error_when_not_configured(self):
        """Test send_email returns error when not configured"""
        service = EmailService()
        service.api_key = None
        service.client = None
        
        result = await service.send_email(
            to="test@example.com",
            subject="Test",
            html_content="<p>Test</p>"
        )
        
        assert result["success"] is False
        assert "not configured" in result["error"]


@pytest.mark.asyncio
class TestPaymentEmailFunctions:
    """Test the high-level email sending functions"""
    
    @patch('services.email.email_service')
    async def test_send_payment_submitted_email_success(self, mock_service):
        """Test successful payment submitted email"""
        mock_service.is_configured.return_value = True
        mock_service.send_email = AsyncMock(return_value={"success": True})
        mock_service.base_url = "https://test.com"
        mock_service.support_email = "support@test.com"
        
        result = await send_payment_submitted_email(
            user_email="test@example.com",
            plan_requested="STANDARD",
            provider="MONCASH",
            amount=500.0,
            currency="HTG",
            billing_month="2026-02",
            reference="REF123",
            payment_id="pay-123"
        )
        
        # Verify email was sent
        mock_service.send_email.assert_called_once()
        call_args = mock_service.send_email.call_args
        
        # Verify correct recipient
        assert call_args[0][0] == "test@example.com"
        
        # Verify subject contains expected text
        assert "Paiement reçu" in call_args[0][1] or "Payment received" in call_args[0][1]
    
    @patch('services.email.email_service')
    async def test_send_payment_approved_email_success(self, mock_service):
        """Test successful payment approved email"""
        mock_service.is_configured.return_value = True
        mock_service.send_email = AsyncMock(return_value={"success": True})
        mock_service.base_url = "https://test.com"
        mock_service.support_email = "support@test.com"
        
        result = await send_payment_approved_email(
            user_email="test@example.com",
            plan_name="TEAM",
            expires_at="2026-03-17T00:00:00+00:00",
            payment_id="pay-123"
        )
        
        mock_service.send_email.assert_called_once()
        call_args = mock_service.send_email.call_args
        
        assert call_args[0][0] == "test@example.com"
        assert "approuvé" in call_args[0][1] or "approved" in call_args[0][1]
    
    @patch('services.email.email_service')
    async def test_send_payment_rejected_email_success(self, mock_service):
        """Test successful payment rejected email"""
        mock_service.is_configured.return_value = True
        mock_service.send_email = AsyncMock(return_value={"success": True})
        mock_service.base_url = "https://test.com"
        mock_service.support_email = "support@test.com"
        
        result = await send_payment_rejected_email(
            user_email="test@example.com",
            plan_requested="STANDARD",
            rejection_note="Invalid reference",
            payment_id="pay-123"
        )
        
        mock_service.send_email.assert_called_once()
        call_args = mock_service.send_email.call_args
        
        assert call_args[0][0] == "test@example.com"
        assert "rejeté" in call_args[0][1] or "rejected" in call_args[0][1]
    
    @patch('services.email.email_service')
    async def test_email_failure_does_not_raise_exception(self, mock_service):
        """Test that email failures don't raise exceptions (non-blocking)"""
        mock_service.is_configured.return_value = True
        mock_service.send_email = AsyncMock(side_effect=Exception("Network error"))
        mock_service.base_url = "https://test.com"
        mock_service.support_email = "support@test.com"
        
        # Should not raise, just return error
        result = await send_payment_submitted_email(
            user_email="test@example.com",
            plan_requested="STANDARD",
            provider="MONCASH",
            amount=500.0,
            currency="HTG",
            billing_month="2026-02",
            reference="REF123",
            payment_id="pay-123"
        )
        
        assert result["success"] is False
        assert "error" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
