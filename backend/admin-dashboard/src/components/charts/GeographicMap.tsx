import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { GeographicMetrics } from '../../types/travel.types';

interface GeographicMapProps {
  data: GeographicMetrics;
  metric: 'bookings' | 'revenue' | 'users';
  onCountryClick?: (country: string) => void;
  height?: number;
}

export const GeographicMap: React.FC<GeographicMapProps> = ({
  data,
  metric,
  onCountryClick,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.topCountries.length) return;

    const width = svgRef.current.clientWidth;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create color scale
    const maxValue = Math.max(...data.topCountries.map(c => c[metric]));
    const colorScale = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateBlues);

    // Create country data map
    const countryDataMap = new Map(
      data.topCountries.map(c => [c.code, c])
    );

    // Load world map data
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((world: any) => {
      const countries = feature(world, world.objects.countries);

      // Draw countries
      svg.selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('fill', (d: any) => {
          const countryData = countryDataMap.get(d.properties.ISO_A2);
          return countryData ? colorScale(countryData[metric]) : '#e5e7eb';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .attr('cursor', (d: any) => countryDataMap.has(d.properties.ISO_A2) ? 'pointer' : 'default')
        .on('mouseover', function(event: any, d: any) {
          const countryData = countryDataMap.get(d.properties.ISO_A2);
          if (countryData && tooltipRef.current) {
            d3.select(this).attr('opacity', 0.8);
            
            const formatValue = () => {
              switch (metric) {
                case 'revenue':
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(countryData.revenue);
                case 'bookings':
                  return `${new Intl.NumberFormat('en-US').format(countryData.bookings)} bookings`;
                case 'users':
                  return `${new Intl.NumberFormat('en-US').format(countryData.users)} users`;
              }
            };

            tooltipRef.current.innerHTML = `
              <div class="font-semibold">${countryData.country}</div>
              <div class="text-sm">${formatValue()}</div>
            `;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 10}px`;
          }
        })
        .on('mouseout', function(event: any, d: any) {
          d3.select(this).attr('opacity', 1);
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        })
        .on('click', function(event: any, d: any) {
          const countryData = countryDataMap.get(d.properties.ISO_A2);
          if (countryData && onCountryClick) {
            onCountryClick(countryData.country);
          }
        });

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
          svg.selectAll('path').attr('transform', event.transform);
        });

      svg.call(zoom as any);
    });
  }, [data, metric, height, onCountryClick]);

  return (
    <div className="relative">
      <svg ref={svgRef} width="100%" height={height} />
      <div
        ref={tooltipRef}
        className="absolute bg-gray-900 text-white px-3 py-2 rounded shadow-lg pointer-events-none z-10"
        style={{ display: 'none' }}
      />
      
      {/* Legend */}
      <div className="flex items-center justify-center mt-4 gap-2">
        <span className="text-sm text-gray-600">Low</span>
        <div className="w-32 h-2 bg-gradient-to-r from-blue-100 to-blue-800 rounded" />
        <span className="text-sm text-gray-600">High</span>
      </div>
    </div>
  );
};