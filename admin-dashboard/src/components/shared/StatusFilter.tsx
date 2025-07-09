import React from 'react';

interface StatusFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  statuses: Array<{
    key: string;
    label: string;
    count: number;
  }>;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  activeFilter,
  onFilterChange,
  statuses
}) => {
  return (
    <div className="status-filter-tabs">
      {statuses.map(status => (
        <button
          key={status.key}
          className={`status-tab ${activeFilter === status.key ? 'active' : ''}`}
          onClick={() => onFilterChange(status.key)}
        >
          {status.label} ({status.count})
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;