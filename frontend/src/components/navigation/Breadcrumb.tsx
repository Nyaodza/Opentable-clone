'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb Navigation Component
 * Provides hierarchical navigation and SEO structured data
 * WCAG 2.1 compliant with proper ARIA labels
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const baseUrl = 'https://opentable-clone.vercel.app';

  // Prepare structured data items
  const structuredDataItems = [
    { name: 'Home', url: baseUrl },
    ...items.map((item) => ({
      name: item.label,
      url: item.href ? `${baseUrl}${item.href}` : baseUrl,
    })),
  ];

  return (
    <>
      {/* SEO Structured Data */}
      <BreadcrumbStructuredData items={structuredDataItems} />

      {/* Visual Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-sm ${className}`}
      >
        <ol
          className="flex items-center space-x-2 flex-wrap"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {/* Home Link */}
          <li
            className="flex items-center"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              href="/"
              className="text-gray-500 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              itemProp="item"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only" itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {items.map((item, index) => (
            <li
              key={item.label}
              className="flex items-center"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <ChevronRight
                className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0"
                aria-hidden="true"
              />

              {item.href && index < items.length - 1 ? (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-1"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  className="text-gray-900 font-medium"
                  aria-current="page"
                  itemProp="name"
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 2)} />
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumb;
