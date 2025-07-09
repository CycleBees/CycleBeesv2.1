import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionButton
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionButton && (
        <button
          className={actionButton.className || 'create-first-btn'}
          onClick={actionButton.onClick}
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;