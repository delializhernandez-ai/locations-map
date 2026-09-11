import { useState } from 'react';
import './TopClientsFilter.css';

/**
 * Companies panel - lists every company currently matching the other
 * sidebar filters, with checkboxes to further narrow which of them render
 * on the map.
 *
 * "Show Top Clients Only" doesn't hide anything by itself - it just
 * switches this same list from alphabetical (name only) to ranked by each
 * company's number of Active locations, largest first, with that count
 * shown next to the name (matching the HubSpot "Active Locations" report).
 * Those counts refresh with the nightly HubSpot sync, so the ranking can
 * shift day to day.
 *
 * Props:
 * - companies: array of { name, activeLocations } - one entry per company,
 *   with its total count of currently-Active locations (independent of the
 *   other sidebar filters).
 * - availableCompanies: array of company name strings currently matching
 *   every other active filter - this is what gets listed as checkboxes.
 * - selected: array of company names currently checked, restricting the
 *   map to just those companies.
 * - onChange: callback(newSelectedArray).
 */
export default function TopClientsFilter({
  companies = [],
  availableCompanies = [],
  selected = [],
  onChange,
}) {
  const [sortByTopClients, setSortByTopClients] = useState(false);

  const countByName = new Map(companies.map((c) => [c.name, c.activeLocations || 0]));

  const displayedCompanies = sortByTopClients
    ? [...availableCompanies].sort((a, b) => (countByName.get(b) || 0) - (countByName.get(a) || 0))
    : availableCompanies;

  return (
    <div className="filter-container top-clients-filter">
      <label className="top-clients-toggle">
        <input
          type="checkbox"
          checked={sortByTopClients}
          onChange={(e) => setSortByTopClients(e.target.checked)}
        />
        <span>Show Top Clients Only</span>
      </label>

      <label>{`Companies Rendered (${availableCompanies.length}):`}</label>
      <div className="vertical-checkboxes">
        {displayedCompanies.map((name) => (
          <label key={name} className="vertical-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(name)}
              onChange={(e) => {
                onChange(
                  e.target.checked ? [...selected, name] : selected.filter((v) => v !== name)
                );
              }}
            />
            {sortByTopClients ? `${name} (${countByName.get(name) || 0})` : name}
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <button onClick={() => onChange([])} className="clear-verticals">
          Clear selection
        </button>
      )}
    </div>
  );
}

