import { useState } from 'react';
import './TopClientsFilter.css';

/**
 * Top Clients filter panel — slider version.
 * Sits in the sidebar alongside the other "Filter by ___" panels.
 *
 * Props:
 * - companies: array of { name, activeLocations } — one entry per company,
 *   with a count of that company's currently-Active locations.
 * - onFilterChange: callback(filteredCompanies) fired whenever the toggle or
 *   slider changes. Receives the full `companies` list when the toggle is
 *   off (i.e. "no restriction"), or the subset meeting the threshold when on.
 */
export default function TopClientsFilter({ companies = [], onFilterChange }) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(0);

  const maxLocations = Math.max(...companies.map((c) => c.activeLocations || 0), 1);

  const applyFilter = (isEnabled, thresholdValue) => {
    if (!isEnabled) {
      onFilterChange(companies);
      return;
    }
    const filtered = companies
      .filter((c) => (c.activeLocations || 0) >= thresholdValue)
      .sort((a, b) => (b.activeLocations || 0) - (a.activeLocations || 0));
    onFilterChange(filtered);
  };

  const handleToggle = (e) => {
    const isEnabled = e.target.checked;
    setEnabled(isEnabled);
    applyFilter(isEnabled, threshold);
  };

  const handleSlider = (e) => {
    const value = Number(e.target.value);
    setThreshold(value);
    if (enabled) applyFilter(true, value);
  };

  const matchCount = companies.filter((c) => (c.activeLocations || 0) >= threshold).length;

  return (
    <div className="filter-container top-clients-filter">
      <label className="top-clients-toggle">
        <input type="checkbox" checked={enabled} onChange={handleToggle} />
        <span>Show Top Clients Only</span>
      </label>

      <div className={`slider-wrap ${enabled ? '' : 'slider-disabled'}`}>
        <div className="slider-label-row">
          <span>Min. Active Locations</span>
          <span className="slider-value">{threshold}+</span>
        </div>
        <input
          type="range"
          min="0"
          max={maxLocations}
          value={threshold}
          onChange={handleSlider}
          disabled={!enabled}
          className="top-clients-slider"
        />
        <div className="slider-scale-row">
          <span>0</span>
          <span>{maxLocations}</span>
        </div>
      </div>

      {enabled && (
        <div className="top-clients-match-count">
          Showing {matchCount} of {companies.length} companies
        </div>
      )}
    </div>
  );
}
