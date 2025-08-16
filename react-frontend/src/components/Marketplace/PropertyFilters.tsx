import React from 'react';
import { PropertyFilter } from '../../services/propertyMarketplaceService';

interface PropertyFiltersProps {
  filters: PropertyFilter;
  onFiltersChange: (filters: Partial<PropertyFilter>) => void;
  onResetFilters: () => void;
  className?: string;
}

export const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters,
  onFiltersChange,
  onResetFilters,
  className = '',
}) => {
  const hasActiveFilters = Object.values(filters).some((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    return key !== 'sortBy' && value !== 'all' && value !== undefined;
  });

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Reset All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Property Class Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Property Class
          </label>
          <select
            value={filters.class || 'all'}
            onChange={(e) => onFiltersChange({ class: e.target.value as any })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Classes</option>
            <option value="C">Class C ($100k-$500k)</option>
            <option value="B">Class B ($500k-$2M)</option>
            <option value="A">Class A ($2M+)</option>
          </select>
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Region
          </label>
          <select
            value={filters.region || 'all'}
            onChange={(e) => onFiltersChange({ region: e.target.value as any })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Regions</option>
            <option value="midwest">Midwest</option>
            <option value="southwest">Southwest</option>
            <option value="southeast">Southeast</option>
            <option value="anywhere">Anywhere</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value as any })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="newest">Newest</option>
            <option value="price">Price: Low to High</option>
            <option value="yield">Highest Yield</option>
            <option value="timeRemaining">Ending Soon</option>
          </select>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Quick Filters
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.affordableOnly || false}
                onChange={(e) => onFiltersChange({ affordableOnly: e.target.checked })}
                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Affordable Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.timeRemaining === 'ending_soon'}
                onChange={(e) => onFiltersChange({ timeRemaining: e.target.checked ? 'ending_soon' : 'all' })}
                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Ending Soon</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};