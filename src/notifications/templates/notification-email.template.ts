import { escapeHtml } from '../../email/templates/template-helpers';

export type NotificationEmailTemplateParams = {
  brandName: string;
  logoUrl: string;
  platformUrl: string;
  supportEmail: string;
  title: string;
  greeting?: string;
  bodyLines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  direction?: 'rtl' | 'ltr';
};

export type BuiltNotificationEmail = {
  htmlContent: string;
  textContent: string;
};

export function buildNotificationEmailTemplate({
  brandName,
  logoUrl,
  platformUrl,
  supportEmail,
  title,
  greeting,
  bodyLines,
  ctaLabel,
  ctaUrl,
  footerNote,
  direction = 'rtl',
}: NotificationEmailTemplateParams): BuiltNotificationEmail {
  const safeBrandName = escapeHtml(brandName);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safePlatformUrl = escapeHtml(platformUrl);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeTitle = escapeHtml(title);
  const safeGreeting = greeting ? escapeHtml(greeting) : undefined;
  const safeBody = bodyLines
    .filter((line) => line.trim().length > 0)
    .map(
      (line) =>
        `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.8;">${escapeHtml(line)}</p>`,
    )
    .join('');
  const ctaSection =
    ctaLabel && ctaUrl
      ? `<div style="margin:24px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#00214B;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 20px;font-size:14px;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>`
      : '';
  const safeFooterNote = footerNote
    ? `<p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.7;">${escapeHtml(footerNote)}</p>`
    : '';

  return {
    htmlContent: `<!doctype html>
<html lang="${direction === 'rtl' ? 'ar' : 'en'}" dir="${direction}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Tahoma,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:26px 28px 10px;text-align:center;">
                <a href="${safePlatformUrl}" style="text-decoration:none;">
                  <img src="${safeLogoUrl}" alt="${safeBrandName}" style="max-width:132px;height:auto;border:0;">
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 30px;text-align:${direction === 'rtl' ? 'right' : 'left'};">
                <h1 style="margin:0 0 18px;font-size:24px;line-height:1.35;color:#111827;">${safeTitle}</h1>
                ${safeGreeting ? `<p style="margin:0 0 14px;color:#111827;font-size:16px;line-height:1.8;font-weight:700;">${safeGreeting}</p>` : ''}
                ${safeBody}
                ${ctaSection}
                ${safeFooterNote}
                <p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.8;">
                  ${direction === 'rtl' ? 'للمساعدة يمكنكم التواصل عبر' : 'For help, contact'}
                  <a href="mailto:${safeSupportEmail}" style="color:#00214B;text-decoration:underline;">${safeSupportEmail}</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">${direction === 'rtl' ? `هذه رسالة آلية من ${safeBrandName}.` : `This is an automated message from ${safeBrandName}.`}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    textContent: [
      title,
      '',
      greeting,
      ...bodyLines,
      ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : undefined,
      footerNote,
      supportEmail
        ? direction === 'rtl'
          ? `للمساعدة: ${supportEmail}`
          : `Support: ${supportEmail}`
        : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n'),
  };
}
