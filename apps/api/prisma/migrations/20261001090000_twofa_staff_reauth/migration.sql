-- Emailed staff re-authentication code (data-model §3.A, ADR-002 §5; spec 16 AC-7): adminRequestReauthCode
-- creates it, only adminReauthenticate `method: email_code` accepts it.
ALTER TYPE "twofa_purpose" ADD VALUE 'staff_reauth';
