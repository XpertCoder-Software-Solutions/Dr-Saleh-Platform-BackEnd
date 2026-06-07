import { escapeHtml } from './template-helpers';

export type ContactMessageConfirmationTemplateParams = {
  brandName: string;
  name: string;
  logoUrl?: string;
  platformUrl?: string;
  supportEmail?: string;
};

export function buildContactMessageConfirmationTemplate({
  brandName,
  name,
  logoUrl,
  platformUrl,
  supportEmail,
}: ContactMessageConfirmationTemplateParams): string {
  const safeBrandName = escapeHtml(brandName);
  const safeName = escapeHtml(name);
  const logoSection = buildLogoSection(logoUrl, safeBrandName);
  const openPlatformButton = buildOpenPlatformButton(platformUrl);
  const supportSection = buildSupportSection(supportEmail);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>تم استلام رسالتكم</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#edf6ff;font-family:Arial,Tahoma,sans-serif;color:#111827;direction:rtl;text-align:right;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d9e6f5;box-shadow:0 14px 40px rgba(0,33,75,0.12);">
      <tr>
        <td style="padding:24px 24px;text-align:center;background:#00214B;background-image:linear-gradient(135deg,#6DC8FF 0%,#00214B 100%);">
          ${logoSection}
        </td>
      </tr>
      <tr>
        <td style="padding:28px 24px 12px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.4;color:#111827;">تم استلام رسالتكم</h1>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.9;">مرحباً <strong>${safeName}</strong>،</p>
          <p style="margin:12px 0 0;color:#374151;font-size:15px;line-height:1.9;">نشكر تواصلكم معنا.</p>
          <p style="margin:12px 0 0;color:#374151;font-size:15px;line-height:1.9;">تم استلام رسالتكم بنجاح وسيتم مراجعتها من قبل فريقنا، وسيتم التواصل معكم في أقرب وقت ممكن.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px 4px;">
          <div style="border:1px solid #b9d7f2;background:linear-gradient(180deg,#f8fcff 0%,#eef6ff 100%);border-radius:14px;padding:16px;">
            <p style="margin:0;color:#111827;font-size:15px;line-height:1.9;">نقدر اهتمامكم بـ <strong>${safeBrandName}</strong>. سيقوم فريقنا بمراجعة الرسالة والرد عبر بيانات التواصل التي تم إدخالها.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 8px;">
          ${openPlatformButton}
          ${supportSection}
          <p style="margin:18px 0 0;color:#374151;font-size:14px;line-height:1.9;">مع خالص التحية،<br />فريق منصة د. صالح</p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 22px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.8;">هذه رسالة آلية من ${safeBrandName}. يرجى عدم الرد مباشرة على هذا البريد.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildLogoSection(logoUrl: string | undefined, safeBrandName: string) {
  if (!logoUrl) {
    return `<div style="font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">${safeBrandName}</div>`;
  }

  return `<img src="${escapeHtml(logoUrl)}" alt="${safeBrandName}" style="max-width:160px;height:auto;display:inline-block;" />`;
}

function buildOpenPlatformButton(platformUrl: string | undefined): string {
  if (!platformUrl) {
    return '';
  }

  const safePlatformUrl = escapeHtml(platformUrl);

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0;">
            <tr>
              <td style="border-radius:10px;background:#00214B;text-align:center;">
                <a href="${safePlatformUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">زيارة المنصة</a>
              </td>
            </tr>
          </table>`;
}

function buildSupportSection(supportEmail: string | undefined): string {
  if (!supportEmail) {
    return '';
  }

  const safeSupportEmail = escapeHtml(supportEmail);

  return `<p style="margin:14px 0 0;color:#6b7280;font-size:12px;line-height:1.8;">للمساعدة يمكنكم التواصل عبر <a href="mailto:${safeSupportEmail}" style="color:#00214B;text-decoration:underline;">${safeSupportEmail}</a>.</p>`;
}
