/**
 * Masks an email address for safe logging.
 * "joao.silva@empresa.com.br" → "j***@empresa.com.br"
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * Masks a phone number, keeping only the last 4 digits.
 * "+5511999998888" → "***8888"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  return `***${phone.slice(-4)}`;
}
