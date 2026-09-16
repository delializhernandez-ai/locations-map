import { useState, useEffect } from 'react';
import './TopClientsFilter.css';

const TOP_N_OPTIONS = [10, 20, 30, 50];

/**
 * Companies panel for the sidebar.
 *
 * By default this shows every company currently matching the other sidebar
 * filters ("Companies Rendered"), with checkboxes to further narrow which of
 * them render on the map.
 *
 * Checking "Show Top Clients Only" switches to a Top 10/20/30/50 cutoff:
 * picking a cutoff restricts the map to exactly those top companies (ranked
 * by each company's number of Active locations, largest first, matching the
 * HubSpot "Active Locations" report) and shows a numbered summary of who's
 * included, with their counts. Those counts refresh with the nightly HubSpot
 * sync, so the ranking - and who falls inside a given cutoff - can shift day
 * to day. Turning the toggle back off clears the cutoff-based selection and
 * returns to the plain "Companies Rendered" checkbox list.
 *
 * Props:
 * - companies: array of { name, activeLocations } - one entry per company,
 *   with its total count of currently-Active locations (independent of the
 *   other sidebar filters).
 * - availableCompanies: array of company name strings currently matching
 *   every other active filter - this is what gets listed/ranked.
 * - selected: array of company names currently checked/selected, restricting
 *   the map to just those companies.
 * - onChange: callback(newSelectedArray).
 */
export default function TopClientsFilter({
  companies = [],
  availableCompanies = [],
  selected = [],
  onChange,
}) {
  const [sortByTopClients, setSortByTopClients] = useState(false);
  const [topN, setTopN] = useState(10);

  const countByName = new Map(companies.map((c) => [c.name, c.activeLocations || 0]));

  const rankedCompanies = [...availableCompanies].sort(
    (a, b) => (countByName.get(b) || 0) - (countByName.get(a) || 0)
  );
  const topCompanies = rankedCompanies.slice(0, topN);
  const availableKey = availableCompanies.join('|');

  // While "Show Top Clients Only" is on, the map is kept in sync with
  // whichever cutoff is selected - changing the cutoff, or the underlying
  // available-companies list changing because another filter moved, both
  // update which pins render automatically.
  useEffect(() => {
    if (!sortByTopClients) return;
    onChange(topCompanies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByTopClients, topN, availableKey]);

  const handleToggle = (checked) => {
    setSortByTopClients(checked);
    if (!checked) onChange([]);
  };

  return (
    <div className="filter-container top-clients-filter">
      <label className="top-clients-toggle">
        <input
          type="checkbox"
          checked={sortByTopClients}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        <span>Show Top Clients Only</span>
      </label>

      {sortByTopClients ? (
        <>
          <div className="top-n-buttons">
            {TOP_N_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`top-n-button${topN === n ? ' active' : ''}`}
                onClick={() => setTopN(n)}
              >
                {`Top ${n}`}
              </button>
            ))}
          </div>

          <label>{`Top ${topN} Companies (${topCompanies.length}):`}</label>
          <ol className="top-clients-summary">
            {topCompanies.map((name) => (
              <li key={name}>{`${name} (${countByName.get(name) || 0})`}</li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <label>{`Companies Rendered (${availableCompanies.length}):`}</label>
          <div className="vertical-checkboxes">
            {availableCompanies.map((name) => (
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
                {name}
              </label>
            ))}
          </div>

          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="clear-verticals">
              Clear selection
            </button>
          )}
        </>
      )}
    </div>
  );
}
