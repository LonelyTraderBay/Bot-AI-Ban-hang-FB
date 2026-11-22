BEGIN;

ALTER TABLE public.consent_evidence ADD COLUMN recovery_audit_id UUID;
ALTER TABLE public.consent_evidence ADD CONSTRAINT consent_evidence_shop_id_recovery_audit_id_fkey
    FOREIGN KEY (shop_id, recovery_audit_id) REFERENCES public.audit_entries(shop_id, id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE UNIQUE INDEX consent_evidence_shop_id_recovery_audit_id_consent_id_key
    ON public.consent_evidence(shop_id, recovery_audit_id, consent_id);

ALTER TABLE public.consent_evidence DROP CONSTRAINT consent_evidence_source_check;
ALTER TABLE public.consent_evidence ADD CONSTRAINT consent_evidence_source_check
    CHECK (num_nonnulls(challenge_id, privacy_request_id, recovery_audit_id) = 1);

COMMIT;
