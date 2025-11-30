import { Tenant } from '../models/tenant.model';
import { AppError } from '../utils/errors';
import path from 'path';
import fs from 'fs/promises';
import { generateCSS, generateFavicon } from '../utils/branding';
import { S3Service } from './s3.service';

export interface WhiteLabelConfig {
  tenant: Tenant;
  domain: string;
  branding: {
    companyName: string;
    tagline?: string;
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
    customCSS?: string;
    emailHeader?: string;
    emailFooter?: string;
  };
  features: {
    hideOpentableBranding: boolean;
    customTermsUrl?: string;
    customPrivacyUrl?: string;
    customSupportEmail?: string;
    customSupportPhone?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
  };
}

export class WhiteLabelService {
  static async configureWhiteLabel(
    tenantId: string,
    config: Partial<WhiteLabelConfig>
  ): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (!tenant.settings.features.whiteLabel) {
      throw new AppError('White label feature not available in your plan', 403);
    }

    // Update tenant settings
    if (config.branding) {
      tenant.settings.branding = {
        ...tenant.settings.branding,
        ...config.branding,
      };
    }

    // Generate custom CSS
    if (config.branding?.primaryColor || config.branding?.secondaryColor) {
      const customCSS = await this.generateCustomCSS(tenant);
      tenant.settings.branding.customCSS = customCSS;
    }

    // Upload assets to S3
    if (config.branding?.logo) {
      const logoUrl = await S3Service.uploadFile(
        config.branding.logo,
        `tenants/${tenantId}/logo.png`
      );
      tenant.settings.branding.logo = logoUrl;
    }

    if (config.branding?.favicon) {
      const faviconUrl = await S3Service.uploadFile(
        config.branding.favicon,
        `tenants/${tenantId}/favicon.ico`
      );
      tenant.settings.branding.favicon = faviconUrl;
    }

    await tenant.save();

    // Clear cache
    await this.clearTenantCache(tenantId);
  }

  static async generateCustomCSS(tenant: Tenant): Promise<string> {
    const { primaryColor, secondaryColor } = tenant.settings.branding;
    
    const css = `
      :root {
        --primary-color: ${primaryColor};
        --secondary-color: ${secondaryColor};
        --primary-rgb: ${this.hexToRgb(primaryColor)};
        --secondary-rgb: ${this.hexToRgb(secondaryColor)};
      }
      
      .btn-primary {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }
      
      .btn-primary:hover {
        background-color: color-mix(in srgb, var(--primary-color) 85%, black);
        border-color: color-mix(in srgb, var(--primary-color) 85%, black);
      }
      
      .text-primary {
        color: var(--primary-color) !important;
      }
      
      .bg-primary {
        background-color: var(--primary-color) !important;
      }
      
      .border-primary {
        border-color: var(--primary-color) !important;
      }
      
      a {
        color: var(--primary-color);
      }
      
      a:hover {
        color: color-mix(in srgb, var(--primary-color) 85%, black);
      }
      
      ${tenant.settings.branding.customCSS || ''}
    `;

    return css.trim();
  }

  static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  }

  static async generateEmailTemplate(tenant: Tenant, content: string): Promise<string> {
    const { branding } = tenant.settings;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title || 'Notification'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 2px solid ${branding.primaryColor};
            }
            .logo {
              max-width: 200px;
              height: auto;
            }
            .content {
              padding: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: ${branding.primaryColor};
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${branding.emailHeader || `<img src="${branding.logo}" alt="${tenant.name}" class="logo">`}
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            ${branding.emailFooter || `
              <p>&copy; ${new Date().getFullYear()} ${tenant.name}. All rights reserved.</p>
              <p>
                <a href="${tenant.metadata.customTermsUrl || '/terms'}" style="color: ${branding.primaryColor};">Terms of Service</a> |
                <a href="${tenant.metadata.customPrivacyUrl || '/privacy'}" style="color: ${branding.primaryColor};">Privacy Policy</a>
              </p>
            `}
          </div>
        </body>
      </html>
    `;
  }

  static async generateManifest(tenant: Tenant): Promise<object> {
    const { branding } = tenant.settings;
    
    return {
      name: tenant.name,
      short_name: tenant.name,
      description: tenant.metadata.description || `${tenant.name} - Restaurant Reservations`,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: branding.primaryColor,
      icons: [
        {
          src: branding.favicon,
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon',
        },
        {
          src: branding.logo,
          type: 'image/png',
          sizes: '192x192',
        },
        {
          src: branding.logo,
          type: 'image/png',
          sizes: '512x512',
        },
      ],
    };
  }

  static async getPublicConfig(domain: string): Promise<any> {
    // Try to find tenant by domain
    let tenant = await Tenant.findOne({
      where: { domain },
    });

    if (!tenant) {
      // Try custom domains
      tenant = await Tenant.findOne({
        where: {
          customDomains: {
            contains: [domain],
          },
        },
      });
    }

    if (!tenant) {
      // Try subdomain
      const subdomain = domain.split('.')[0];
      tenant = await Tenant.findOne({
        where: { slug: subdomain },
      });
    }

    if (!tenant) {
      return null;
    }

    return {
      tenantId: tenant.id,
      name: tenant.name,
      branding: {
        logo: tenant.settings.branding.logo,
        favicon: tenant.settings.branding.favicon,
        primaryColor: tenant.settings.branding.primaryColor,
        secondaryColor: tenant.settings.branding.secondaryColor,
        customCSS: tenant.settings.branding.customCSS,
      },
      features: {
        loyaltyProgram: tenant.settings.features.loyaltyProgram,
        multipleLocations: tenant.settings.features.multipleLocations,
      },
      seo: tenant.metadata.seo || {},
    };
  }

  static async clearTenantCache(tenantId: string): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return;

    // Clear Redis cache
    const { redisClient } = require('../config/redis');
    
    // Clear all possible cache keys
    await redisClient.del(`tenant:id:${tenantId}`);
    await redisClient.del(`tenant:subdomain:${tenant.slug}`);
    await redisClient.del(`tenant:domain:${tenant.domain}`);
    
    for (const customDomain of tenant.customDomains) {
      await redisClient.del(`tenant:domain:${customDomain}`);
    }
  }

  static async validateCustomDomain(domain: string): Promise<boolean> {
    // Check DNS records to verify domain ownership
    const dns = require('dns').promises;
    
    try {
      // Check for TXT record with verification code
      const txtRecords = await dns.resolveTxt(domain);
      const verificationRecord = txtRecords.find((record: string[]) =>
        record.some(txt => txt.includes('opentable-verify='))
      );
      
      return !!verificationRecord;
    } catch (error) {
      return false;
    }
  }

  static async generateVerificationCode(tenantId: string): Promise<string> {
    const crypto = require('crypto');
    return `opentable-verify=${crypto
      .createHash('sha256')
      .update(`${tenantId}:${Date.now()}`)
      .digest('hex')
      .substring(0, 16)}`;
  }
}