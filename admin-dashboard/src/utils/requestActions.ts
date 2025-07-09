interface ActionConfig {
  label: string;
  onClick: () => void;
  className: string;
  condition?: boolean;
}

// Generate common request actions based on status and type
export const generateRequestActions = (
  status: string,
  requestId: number,
  type: 'repair' | 'rental',
  handlers: {
    onView: (id: number) => void;
    onStatusChange: (id: number, newStatus: string) => void;
    onDelete: (id: number) => void;
  }
): ActionConfig[] => {
  const actions: ActionConfig[] = [
    {
      label: 'View Details',
      onClick: () => handlers.onView(requestId),
      className: 'view'
    }
  ];

  const lowerStatus = status.toLowerCase();

  // Common status transitions
  if (lowerStatus === 'pending') {
    actions.push({
      label: 'Approve',
      onClick: () => handlers.onStatusChange(requestId, 'approved'),
      className: 'approve'
    });
  }

  if (lowerStatus === 'waiting_payment') {
    const nextStatus = type === 'rental' ? 'arranging_delivery' : 'active';
    actions.push({
      label: 'Payment Received',
      onClick: () => handlers.onStatusChange(requestId, nextStatus),
      className: 'progress'
    });
  }

  // Type-specific transitions
  if (type === 'repair') {
    if (lowerStatus === 'approved') {
      actions.push({
        label: 'Start Work',
        onClick: () => handlers.onStatusChange(requestId, 'active'),
        className: 'progress'
      });
    }
    
    if (lowerStatus === 'active') {
      actions.push({
        label: 'Complete',
        onClick: () => handlers.onStatusChange(requestId, 'completed'),
        className: 'complete'
      });
    }
  } else if (type === 'rental') {
    if (lowerStatus === 'approved') {
      actions.push({
        label: 'Arrange Delivery',
        onClick: () => handlers.onStatusChange(requestId, 'arranging_delivery'),
        className: 'progress'
      });
    }
    
    if (lowerStatus === 'arranging_delivery') {
      actions.push({
        label: 'Delivered',
        onClick: () => handlers.onStatusChange(requestId, 'active_rental'),
        className: 'progress'
      });
    }
    
    if (lowerStatus === 'active_rental') {
      actions.push({
        label: 'Complete',
        onClick: () => handlers.onStatusChange(requestId, 'completed'),
        className: 'complete'
      });
    }
  }

  // Delete action (always available)
  actions.push({
    label: 'Delete',
    onClick: () => handlers.onDelete(requestId),
    className: 'delete'
  });

  return actions;
};

// Generate quick info items for request cards
export const generateQuickInfo = (
  request: any, 
  type: 'repair' | 'rental'
): Array<{label: string, value: string | number}> => {
  const baseInfo = [
    { label: 'Customer', value: request.user_name },
    { label: 'Amount', value: `₹${request.net_amount || request.total_amount}` }
  ];

  if (type === 'repair') {
    baseInfo.push(
      { label: 'Services', value: `${request.services?.length || 0} service${request.services?.length !== 1 ? 's' : ''}` },
      { label: 'Date', value: new Date(request.preferred_date || request.created_at).toLocaleDateString() }
    );
  } else if (type === 'rental') {
    baseInfo.push(
      { label: 'Bicycle', value: request.bicycle_name },
      { label: 'Duration', value: `${request.duration_count} ${request.duration_type}` }
    );
  }

  return baseInfo;
};

// Generate summary rows for request cards
export const generateSummaryRows = (
  request: any, 
  type: 'repair' | 'rental'
): Array<{label: string, value: string | number}> => {
  const baseRows = [
    { label: 'Phone', value: request.user_phone },
    { label: 'Payment', value: request.payment_method }
  ];

  if (type === 'repair') {
    baseRows.push(
      { label: 'Time', value: request.preferred_time_slot || 'Not specified' }
    );
    
    if (request.files?.length > 0) {
      baseRows.push(
        { label: 'Files', value: `${request.files.length} attached` }
      );
    }
  } else if (type === 'rental') {
    baseRows.push(
      { label: 'Date', value: new Date(request.created_at).toLocaleDateString() }
    );
  }

  return baseRows;
};