import React from 'react';

interface QuickInfoItem {
  label: string;
  value: string | number;
}

interface RequestCardProps {
  id: number;
  status: string;
  quickInfo: QuickInfoItem[];
  summaryRows: Array<{
    label: string;
    value: string | number;
  }>;
  actions: Array<{
    label: string;
    onClick: () => void;
    className: string;
    condition?: boolean;
  }>;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

const RequestCard: React.FC<RequestCardProps> = ({
  id,
  status,
  quickInfo,
  summaryRows,
  actions,
  getStatusColor,
  getStatusText
}) => {
  return (
    <div className="request-card">
      <div className="request-header">
        <h4>Request #{id}</h4>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(status) }}
        >
          {getStatusText(status)}
        </span>
      </div>

      <div className="quick-info">
        {quickInfo.map((item, index) => (
          <div key={index} className="quick-info-item">
            <span className="quick-info-label">{item.label}</span>
            <span className="quick-info-value">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="request-summary">
        {summaryRows.map((row, index) => (
          <div key={index} className="summary-row">
            <span className="summary-label">{row.label}:</span>
            <span className="summary-value">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="request-actions">
        {actions.map((action, index) => (
          action.condition !== false && (
            <button
              key={index}
              onClick={action.onClick}
              className={`action-btn ${action.className}`}
            >
              {action.label}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default RequestCard;