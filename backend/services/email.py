"""
Email Service for Kantik Tracks Studio
Sends transactional emails for payment notifications using SendGrid
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Literal
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)

# Email configuration from environment
EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'sendgrid')
SENDGRID_API_KEY = os.environ.get('RESEND_API_KEY')  # Using RESEND_API_KEY as specified
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Kantik Tracks <no-reply@kantik.ht>')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://worship-charts-ht.preview.emergentagent.com')
SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', 'support@kantik.ht')


class EmailService:
    """Email service for sending transactional emails"""
    
    def __init__(self):
        self._client = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Lazy initialization to ensure env vars are loaded"""
        if self._initialized:
            return
        
        self.api_key = os.environ.get('RESEND_API_KEY')
        self.from_email = os.environ.get('EMAIL_FROM', 'Kantik Tracks <no-reply@kantik.ht>')
        self.base_url = os.environ.get('APP_BASE_URL', 'https://worship-charts-ht.preview.emergentagent.com')
        self.support_email = os.environ.get('SUPPORT_EMAIL', 'support@kantik.ht')
        
        if self.api_key:
            try:
                self._client = SendGridAPIClient(self.api_key)
                logger.info(f"SendGrid email client initialized with from={self.from_email}")
            except Exception as e:
                logger.error(f"Failed to initialize SendGrid client: {e}")
        else:
            logger.warning("RESEND_API_KEY not set - email service will be disabled")
        
        self._initialized = True
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        self._ensure_initialized()
        return self._client is not None and self.api_key is not None
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ) -> dict:
        """
        Send an email using SendGrid
        
        Returns:
            dict with 'success' boolean and 'error' message if failed
        """
        self._ensure_initialized()
        
        if not self.is_configured():
            logger.warning("Email service not configured, skipping email send")
            return {"success": False, "error": "Email service not configured"}
        
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to,
                subject=subject,
                html_content=html_content
            )
            
            if plain_content:
                message.add_content(Content("text/plain", plain_content))
            
            response = self._client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to}, subject: {subject}")
                return {"success": True, "status_code": response.status_code}
            else:
                logger.error(f"Email send failed with status {response.status_code}")
                return {"success": False, "error": f"Status code: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return {"success": False, "error": str(e)}


class PaymentEmailTemplates:
    """Email templates for payment notifications - Bilingual (FR/EN)"""
    
    @staticmethod
    def get_base_style() -> str:
        return """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2E0249 0%, #050505 100%); color: #D4AF37; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .detail-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #666; }
            .detail-value { font-weight: 600; }
            .cta-button { display: inline-block; background: #D4AF37; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px; }
            .cta-button:hover { background: #b8942f; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .success-badge { background: #d4edda; color: #155724; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
            .pending-badge { background: #fff3cd; color: #856404; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
            .rejected-badge { background: #f8d7da; color: #721c24; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
            .divider { border-top: 1px solid #e0e0e0; margin: 25px 0; }
            .note-box { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
        """
    
    @staticmethod
    def payment_submitted(
        user_email: str,
        plan_requested: str,
        provider: str,
        amount: float,
        currency: str,
        billing_month: str,
        reference: str,
        base_url: str,
        support_email: str
    ) -> tuple[str, str, str]:
        """
        Generate email for payment submitted (PENDING)
        Returns: (subject, html_content, plain_content)
        """
        plan_display = "Standard" if plan_requested == "STANDARD" else "Team"
        provider_display = "MonCash" if provider == "MONCASH" else "Virement Bancaire / Bank Transfer"
        
        subject = f"Paiement reçu — en attente de validation | Payment received — pending review"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{PaymentEmailTemplates.get_base_style()}</head>
        <body>
        <div class="container">
            <div class="header">
                <h1>Kantik Tracks Studio</h1>
            </div>
            <div class="content">
                <div class="pending-badge">En attente de validation / Pending Review</div>
                
                <h2>Paiement reçu / Payment Received</h2>
                
                <p><strong>Français:</strong> Merci pour votre paiement ! Nous avons bien reçu votre demande d'abonnement. Notre équipe va vérifier votre paiement et activer votre compte dans les prochaines 24 heures.</p>
                
                <p><strong>English:</strong> Thank you for your payment! We have received your subscription request. Our team will verify your payment and activate your account within the next 24 hours.</p>
                
                <div class="detail-box">
                    <div class="detail-row">
                        <span class="detail-label">Plan demandé / Plan Requested:</span>
                        <span class="detail-value">{plan_display}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Méthode / Method:</span>
                        <span class="detail-value">{provider_display}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Montant / Amount:</span>
                        <span class="detail-value">{amount:,.0f} {currency}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mois / Month:</span>
                        <span class="detail-value">{billing_month}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Référence / Reference:</span>
                        <span class="detail-value">{reference}</span>
                    </div>
                </div>
                
                <p style="text-align: center;">
                    <a href="{base_url}/account?tab=history" class="cta-button">Voir mon compte / View My Account</a>
                </p>
                
                <div class="divider"></div>
                
                <p style="color: #666; font-size: 14px;">
                    Si vous avez des questions, contactez-nous à <a href="mailto:{support_email}">{support_email}</a>.<br>
                    If you have any questions, contact us at <a href="mailto:{support_email}">{support_email}</a>.
                </p>
            </div>
            <div class="footer">
                Kantik Tracks Studio — Chants d'Espérance<br>
                <a href="{base_url}">www.kantiktracks.com</a>
            </div>
        </div>
        </body>
        </html>
        """
        
        plain_content = f"""
Kantik Tracks Studio - Paiement reçu / Payment Received

FRANÇAIS:
Merci pour votre paiement ! Nous avons bien reçu votre demande d'abonnement.
Notre équipe va vérifier votre paiement et activer votre compte dans les prochaines 24 heures.

ENGLISH:
Thank you for your payment! We have received your subscription request.
Our team will verify your payment and activate your account within the next 24 hours.

Détails / Details:
- Plan: {plan_display}
- Méthode / Method: {provider_display}
- Montant / Amount: {amount:,.0f} {currency}
- Mois / Month: {billing_month}
- Référence / Reference: {reference}

Voir mon compte / View My Account: {base_url}/account?tab=history

Contact: {support_email}
        """
        
        return subject, html_content, plain_content
    
    @staticmethod
    def payment_approved(
        user_email: str,
        plan_name: str,
        expires_at: str,
        base_url: str,
        support_email: str
    ) -> tuple[str, str, str]:
        """
        Generate email for payment approved (APPROVED)
        Returns: (subject, html_content, plain_content)
        """
        plan_display = "Standard" if plan_name == "STANDARD" else "Team"
        
        # Format expiration date
        try:
            exp_date = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            expires_formatted = exp_date.strftime("%d %B %Y")
        except:
            expires_formatted = expires_at
        
        subject = f"Paiement approuvé — abonnement activé | Payment approved — subscription activated"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{PaymentEmailTemplates.get_base_style()}</head>
        <body>
        <div class="container">
            <div class="header">
                <h1>Kantik Tracks Studio</h1>
            </div>
            <div class="content">
                <div class="success-badge">Abonnement activé / Subscription Activated</div>
                
                <h2>Félicitations ! / Congratulations!</h2>
                
                <p><strong>Français:</strong> Votre paiement a été approuvé et votre abonnement <strong>{plan_display}</strong> est maintenant actif ! Vous pouvez dès maintenant télécharger vos partitions et accéder à toutes les fonctionnalités de votre plan.</p>
                
                <p><strong>English:</strong> Your payment has been approved and your <strong>{plan_display}</strong> subscription is now active! You can now download your chord charts and access all features of your plan.</p>
                
                <div class="detail-box">
                    <div class="detail-row">
                        <span class="detail-label">Plan actif / Active Plan:</span>
                        <span class="detail-value">{plan_display}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Valide jusqu'au / Valid until:</span>
                        <span class="detail-value">{expires_formatted}</span>
                    </div>
                </div>
                
                <p style="text-align: center;">
                    <a href="{base_url}/catalog" class="cta-button">Parcourir le catalogue / Browse Catalog</a>
                    <a href="{base_url}/library" class="cta-button">Ma bibliothèque / My Library</a>
                </p>
                
                <div class="divider"></div>
                
                <p style="color: #666; font-size: 14px;">
                    Questions? Contactez-nous à / Contact us at <a href="mailto:{support_email}">{support_email}</a>
                </p>
            </div>
            <div class="footer">
                Kantik Tracks Studio — Chants d'Espérance<br>
                <a href="{base_url}">www.kantiktracks.com</a>
            </div>
        </div>
        </body>
        </html>
        """
        
        plain_content = f"""
Kantik Tracks Studio - Abonnement activé / Subscription Activated

FRANÇAIS:
Félicitations ! Votre paiement a été approuvé et votre abonnement {plan_display} est maintenant actif !
Vous pouvez dès maintenant télécharger vos partitions et accéder à toutes les fonctionnalités.

ENGLISH:
Congratulations! Your payment has been approved and your {plan_display} subscription is now active!
You can now download your chord charts and access all features.

Détails / Details:
- Plan actif / Active Plan: {plan_display}
- Valide jusqu'au / Valid until: {expires_formatted}

Parcourir le catalogue / Browse Catalog: {base_url}/catalog
Ma bibliothèque / My Library: {base_url}/library

Contact: {support_email}
        """
        
        return subject, html_content, plain_content
    
    @staticmethod
    def payment_rejected(
        user_email: str,
        plan_requested: str,
        rejection_note: Optional[str],
        base_url: str,
        support_email: str
    ) -> tuple[str, str, str]:
        """
        Generate email for payment rejected (REJECTED)
        Returns: (subject, html_content, plain_content)
        """
        plan_display = "Standard" if plan_requested == "STANDARD" else "Team"
        note_html = f'<div class="note-box"><strong>Note de l\'administrateur / Admin Note:</strong><br>{rejection_note}</div>' if rejection_note else ""
        note_plain = f"\nNote de l'administrateur / Admin Note: {rejection_note}\n" if rejection_note else ""
        
        subject = f"Paiement rejeté — action requise | Payment rejected — action required"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{PaymentEmailTemplates.get_base_style()}</head>
        <body>
        <div class="container">
            <div class="header">
                <h1>Kantik Tracks Studio</h1>
            </div>
            <div class="content">
                <div class="rejected-badge">Paiement rejeté / Payment Rejected</div>
                
                <h2>Action requise / Action Required</h2>
                
                <p><strong>Français:</strong> Nous sommes désolés, mais votre paiement pour l'abonnement <strong>{plan_display}</strong> n'a pas pu être approuvé. Veuillez vérifier les informations ci-dessous et soumettre un nouveau paiement.</p>
                
                <p><strong>English:</strong> We're sorry, but your payment for the <strong>{plan_display}</strong> subscription could not be approved. Please check the information below and submit a new payment.</p>
                
                {note_html}
                
                <p><strong>Raisons possibles / Possible reasons:</strong></p>
                <ul>
                    <li>Référence de transaction incorrecte / Incorrect transaction reference</li>
                    <li>Montant incorrect / Incorrect amount</li>
                    <li>Reçu illisible ou manquant / Unreadable or missing receipt</li>
                </ul>
                
                <p style="text-align: center;">
                    <a href="{base_url}/account?tab=payment" class="cta-button">Soumettre un nouveau paiement / Submit New Payment</a>
                </p>
                
                <div class="divider"></div>
                
                <p style="color: #666; font-size: 14px;">
                    Si vous pensez qu'il s'agit d'une erreur, contactez-nous à <a href="mailto:{support_email}">{support_email}</a>.<br>
                    If you believe this is an error, contact us at <a href="mailto:{support_email}">{support_email}</a>.
                </p>
            </div>
            <div class="footer">
                Kantik Tracks Studio — Chants d'Espérance<br>
                <a href="{base_url}">www.kantiktracks.com</a>
            </div>
        </div>
        </body>
        </html>
        """
        
        plain_content = f"""
Kantik Tracks Studio - Paiement rejeté / Payment Rejected

FRANÇAIS:
Nous sommes désolés, mais votre paiement pour l'abonnement {plan_display} n'a pas pu être approuvé.
Veuillez vérifier les informations ci-dessous et soumettre un nouveau paiement.

ENGLISH:
We're sorry, but your payment for the {plan_display} subscription could not be approved.
Please check the information below and submit a new payment.
{note_plain}
Raisons possibles / Possible reasons:
- Référence de transaction incorrecte / Incorrect transaction reference
- Montant incorrect / Incorrect amount
- Reçu illisible ou manquant / Unreadable or missing receipt

Soumettre un nouveau paiement / Submit New Payment: {base_url}/account?tab=payment

Si vous pensez qu'il s'agit d'une erreur, contactez-nous à {support_email}.
If you believe this is an error, contact us at {support_email}.
        """
        
        return subject, html_content, plain_content


# Singleton instance
email_service = EmailService()


async def send_payment_submitted_email(
    user_email: str,
    plan_requested: str,
    provider: str,
    amount: float,
    currency: str,
    billing_month: str,
    reference: str,
    payment_id: str
) -> dict:
    """Send email when payment is submitted (PENDING)"""
    try:
        # Ensure service is initialized before accessing properties
        email_service._ensure_initialized()
        
        subject, html_content, plain_content = PaymentEmailTemplates.payment_submitted(
            user_email=user_email,
            plan_requested=plan_requested,
            provider=provider,
            amount=amount,
            currency=currency,
            billing_month=billing_month,
            reference=reference,
            base_url=email_service.base_url,
            support_email=email_service.support_email
        )
        
        result = await email_service.send_email(user_email, subject, html_content, plain_content)
        
        if not result["success"]:
            logger.error(f"Failed to send payment submitted email: payment_id={payment_id}, user={user_email}, error={result.get('error')}")
        
        return result
    except Exception as e:
        logger.error(f"Exception sending payment submitted email: payment_id={payment_id}, user={user_email}, error={str(e)}")
        return {"success": False, "error": str(e)}


async def send_payment_approved_email(
    user_email: str,
    plan_name: str,
    expires_at: str,
    payment_id: str
) -> dict:
    """Send email when payment is approved (APPROVED)"""
    try:
        # Ensure service is initialized before accessing properties
        email_service._ensure_initialized()
        
        subject, html_content, plain_content = PaymentEmailTemplates.payment_approved(
            user_email=user_email,
            plan_name=plan_name,
            expires_at=expires_at,
            base_url=email_service.base_url,
            support_email=email_service.support_email
        )
        
        result = await email_service.send_email(user_email, subject, html_content, plain_content)
        
        if not result["success"]:
            logger.error(f"Failed to send payment approved email: payment_id={payment_id}, user={user_email}, error={result.get('error')}")
        
        return result
    except Exception as e:
        logger.error(f"Exception sending payment approved email: payment_id={payment_id}, user={user_email}, error={str(e)}")
        return {"success": False, "error": str(e)}


async def send_payment_rejected_email(
    user_email: str,
    plan_requested: str,
    rejection_note: Optional[str],
    payment_id: str
) -> dict:
    """Send email when payment is rejected (REJECTED)"""
    try:
        # Ensure service is initialized before accessing properties
        email_service._ensure_initialized()
        
        subject, html_content, plain_content = PaymentEmailTemplates.payment_rejected(
            user_email=user_email,
            plan_requested=plan_requested,
            rejection_note=rejection_note,
            base_url=email_service.base_url,
            support_email=email_service.support_email
        )
        
        result = await email_service.send_email(user_email, subject, html_content, plain_content)
        
        if not result["success"]:
            logger.error(f"Failed to send payment rejected email: payment_id={payment_id}, user={user_email}, error={result.get('error')}")
        
        return result
    except Exception as e:
        logger.error(f"Exception sending payment rejected email: payment_id={payment_id}, user={user_email}, error={str(e)}")
        return {"success": False, "error": str(e)}
