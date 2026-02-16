
/**
 * Comprehensive list of common temporary/disposable email domains.
 */
const DISPOSABLE_DOMAINS = [
    '10minutemail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'mailinator.com',
    'dropmail.me',
    'getairmail.com',
    'dispostable.com',
    'mohmal.com',
    'yopmail.com',
    'trashmail.com',
    'tempmail.com',
    'teleworm.us',
    'dayrep.com',
    'sharklasers.com',
    'guerrillamail.biz',
    'guerrillamail.de',
    'guerrillamail.net',
    'guerrillamail.org',
    'guerrillamailblock.com',
    'pokemail.net',
    'grr.la',
    'spam4.me',
    'tempmail.net',
    'temp-mail.io',
    'disposable.com',
    'throwawaymail.com',
    'emailondeck.com',
    'burnermail.io',
    'minuteinbox.com',
    'maildrop.cc'
];

/**
 * Checks if an email belongs to a known temporary/disposable domain.
 */
export const isTemporaryEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
};

/**
 * Generates a random 4-digit verification code.
 */
export const generateVerificationCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
