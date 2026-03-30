-- Add tracking_status column to findings table
-- This separates conformity status from tracking status

ALTER TABLE findings 
ADD COLUMN IF NOT EXISTS tracking_status TEXT 
CHECK (tracking_status IN ('pendiente', 'en-proceso', 'resuelto'))
DEFAULT 'pendiente';

-- Update existing findings to set initial tracking_status based on current data
UPDATE findings
SET tracking_status = CASE
  WHEN closed_date IS NOT NULL THEN 'resuelto'
  WHEN corrective_action IS NOT NULL AND corrective_action != '' THEN 'en-proceso'
  ELSE 'pendiente'
END
WHERE status = 'no-conforme';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_findings_tracking_status ON findings(tracking_status);

-- Add comment to document the column
COMMENT ON COLUMN findings.tracking_status IS 'Estado de seguimiento del hallazgo: pendiente, en-proceso, resuelto';
