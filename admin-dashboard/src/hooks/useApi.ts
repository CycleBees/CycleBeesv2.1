import React, { useState, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: string | null;
}

interface ApiOptions {
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useApi = <T = any>() => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: null
  });

  const clearMessages = useCallback(() => {
    setState((prev: ApiState<T>) => ({ ...prev, error: null, success: null }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev: ApiState<T>) => ({ ...prev, loading }));
  }, []);

  const setSuccess = useCallback((message: string) => {
    setState((prev: ApiState<T>) => ({ ...prev, success: message, error: null }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev: ApiState<T>) => ({ ...prev, error: message, success: null }));
  }, []);

  const apiCall = useCallback(async (
    apiFunction: () => Promise<Response>,
    options: ApiOptions = {}
  ) => {
    try {
      setLoading(true);
      clearMessages();
      
      const token = localStorage.getItem('adminToken');
      const response = await apiFunction();

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setState((prev: ApiState<T>) => ({ ...prev, data: data.data || data, loading: false }));
      
      if (options.successMessage) {
        setSuccess(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess(data.data || data);
      }
      
      return data.data || data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setLoading(false);
      
      if (options.onError) {
        options.onError(message);
      }
      
      throw err;
    }
  }, [setLoading, clearMessages, setSuccess, setError]);

  return {
    ...state,
    apiCall,
    clearMessages,
    setLoading,
    setSuccess,
    setError
  };
};

export const createApiCall = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('adminToken');
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
};