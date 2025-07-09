import React, { useState, useCallback } from 'react';

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  const open = useCallback((modalData?: any) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle
  };
};

export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title?: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
  }>({});

  const confirm = useCallback((confirmConfig: typeof config) => {
    setConfig(confirmConfig);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    config.onConfirm?.();
    setIsOpen(false);
    setConfig({});
  }, [config]);

  const handleCancel = useCallback(() => {
    config.onCancel?.();
    setIsOpen(false);
    setConfig({});
  }, [config]);

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel
  };
};