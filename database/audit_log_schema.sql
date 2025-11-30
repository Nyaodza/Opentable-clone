-- Audit Log table for tracking all user actions and system events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_actions ON audit_logs(success, timestamp DESC) WHERE success = false;

-- Partial index for security events
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_events ON audit_logs(timestamp DESC) 
WHERE action IN ('FAILED_LOGIN', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'PERMISSION_DENIED', 'INVALID_TOKEN', 'EXPIRED_TOKEN');

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions and system events';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action (null for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (LOGIN, CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (USER, RESTAURANT, RESERVATION, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'Specific ID of the resource affected';
COMMENT ON COLUMN audit_logs.details IS 'JSON object containing detailed information about the action';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action completed successfully';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the action occurred';

-- Function to automatically clean up old audit logs (older than 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old audit logs (run monthly)
-- This would typically be set up with pg_cron or external scheduler
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 1 * *', 'SELECT cleanup_old_audit_logs();');

-- View for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
    al.*,
    u.first_name,
    u.last_name,
    u.email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.action IN ('FAILED_LOGIN', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'PERMISSION_DENIED', 'INVALID_TOKEN', 'EXPIRED_TOKEN')
    AND al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY al.timestamp DESC;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    COUNT(al.id) as total_actions,
    COUNT(CASE WHEN al.success = true THEN 1 END) as successful_actions,
    COUNT(CASE WHEN al.success = false THEN 1 END) as failed_actions,
    MAX(al.timestamp) as last_activity,
    COUNT(CASE WHEN al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as actions_last_24h,
    COUNT(CASE WHEN al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as actions_last_week
FROM users u
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
ORDER BY last_activity DESC NULLS LAST;

-- View for resource activity summary
CREATE OR REPLACE VIEW resource_activity_summary AS
SELECT 
    resource_type,
    resource_id,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_actions,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action,
    array_agg(DISTINCT action ORDER BY action) as actions_performed
FROM audit_logs
WHERE resource_id IS NOT NULL
GROUP BY resource_type, resource_id
ORDER BY last_action DESC;

-- Function to get audit trail for a specific resource
CREATE OR REPLACE FUNCTION get_resource_audit_trail(
    p_resource_type VARCHAR(50),
    p_resource_id VARCHAR(255),
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    success BOOLEAN,
    timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        al.action,
        al.details,
        al.ip_address,
        al.success,
        al.timestamp
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.resource_type = p_resource_type 
        AND al.resource_id = p_resource_id
    ORDER BY al.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get suspicious activity report
CREATE OR REPLACE FUNCTION get_suspicious_activity_report(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    ip_address VARCHAR(45),
    failed_attempts BIGINT,
    distinct_users BIGINT,
    first_attempt TIMESTAMP WITH TIME ZONE,
    last_attempt TIMESTAMP WITH TIME ZONE,
    sample_user_agents TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.ip_address,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT al.user_id) as distinct_users,
        MIN(al.timestamp) as first_attempt,
        MAX(al.timestamp) as last_attempt,
        array_agg(DISTINCT al.user_agent) as sample_user_agents
    FROM audit_logs al
    WHERE al.success = false
        AND al.action IN ('FAILED_LOGIN', 'PERMISSION_DENIED', 'INVALID_TOKEN')
        AND al.timestamp >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
    GROUP BY al.ip_address
    HAVING COUNT(*) >= 5  -- Multiple failed attempts
    ORDER BY failed_attempts DESC;
END;
$$ LANGUAGE plpgsql;