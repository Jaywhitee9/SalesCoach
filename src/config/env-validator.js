/**
 * Environment Variable Validator
 * Validates required environment variables on server startup
 * Fails fast if critical config is missing
 */

const REQUIRED_VARS = [
    { name: 'SUPABASE_URL', critical: true, aliases: ['VITE_SUPABASE_URL'] },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', critical: true, aliases: ['SUPABASE_SERVICE_KEY'] },
    { name: 'TWILIO_ACCOUNT_SID', critical: false },
    { name: 'TWILIO_AUTH_TOKEN', critical: false },
    { name: 'TWILIO_API_KEY_SID', critical: false },
    { name: 'TWILIO_API_KEY_SECRET', critical: false },
    { name: 'TWILIO_TWIML_APP_SID', critical: false },
];

const OPTIONAL_VARS = [
    { name: 'OPENAI_API_KEY', description: 'AI coaching features' },
    { name: 'SONIOX_API_KEY', description: 'Live transcription' },
    { name: 'FRONTEND_URL', description: 'CORS whitelist & invitation links' },
    { name: 'NODE_ENV', description: 'Environment mode (development/production)' },
];

function validateEnv(logger) {
    const log = logger || console;
    const errors = [];
    const warnings = [];

    // Check required vars
    for (const { name, critical, aliases } of REQUIRED_VARS) {
        const value = process.env[name];
        const aliasValue = aliases?.find(a => process.env[a]);

        if (!value && !aliasValue) {
            if (critical) {
                errors.push(`Missing critical env var: ${name}`);
            } else {
                warnings.push(`Missing env var: ${name} — related features will be disabled`);
            }
        }
    }

    // Check optional vars and log info
    for (const { name, description } of OPTIONAL_VARS) {
        if (!process.env[name]) {
            warnings.push(`Optional env var ${name} not set — ${description}`);
        }
    }

    // Report
    if (warnings.length > 0) {
        for (const w of warnings) {
            log.warn?.(w) || log.log?.(`[WARN] ${w}`);
        }
    }

    if (errors.length > 0) {
        for (const e of errors) {
            log.error?.(e) || log.log?.(`[ERROR] ${e}`);
        }
        throw new Error(`Server cannot start: ${errors.length} critical env var(s) missing:\n  - ${errors.join('\n  - ')}`);
    }

    log.info?.('Environment validation passed') || log.log?.('[INFO] Environment validation passed');
}

module.exports = { validateEnv };
