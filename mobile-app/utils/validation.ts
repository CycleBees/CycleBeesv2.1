export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export const ValidationUtils = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number format (Indian format)
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  },

  /**
   * Validate required field
   */
  isRequired(value: string): boolean {
    return value.trim().length > 0;
  },

  /**
   * Validate minimum length
   */
  hasMinLength(value: string, minLength: number): boolean {
    return value.trim().length >= minLength;
  },

  /**
   * Common form validation for booking forms
   */
  validateBookingForm(formData: {
    email?: string;
    address?: string;
    alternateNumber?: string;
  }): ValidationResult {
    const errors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email || !this.isRequired(formData.email)) {
      errors.email = 'Please enter your email address to continue.';
    } else if (!this.isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Address validation
    if (!formData.address || !this.isRequired(formData.address)) {
      errors.address = 'Please enter your address to continue.';
    }

    // Alternate number validation (optional but if provided, should be valid)
    if (formData.alternateNumber && formData.alternateNumber.trim()) {
      if (!this.isValidPhone(formData.alternateNumber)) {
        errors.alternateNumber = 'Please enter a valid alternate phone number.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate rental specific form
   */
  validateRentalForm(formData: {
    email?: string;
    deliveryAddress?: string;
    alternateNumber?: string;
    selectedBicycle?: any;
  }): ValidationResult {
    const errors: { [key: string]: string } = {};

    // Bicycle selection
    if (!formData.selectedBicycle) {
      errors.bicycle = 'Please select a bicycle to continue.';
    }

    // Base validation
    const baseValidation = this.validateBookingForm({
      email: formData.email,
      address: formData.deliveryAddress,
      alternateNumber: formData.alternateNumber
    });

    // Merge errors
    const allErrors = { ...errors, ...baseValidation.errors };

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors
    };
  },

  /**
   * Validate repair specific form
   */
  validateRepairForm(formData: {
    email?: string;
    address?: string;
    alternateNumber?: string;
    selectedServices?: any[];
    timeSlotId?: number;
  }): ValidationResult {
    const errors: { [key: string]: string } = {};

    // Services selection
    if (!formData.selectedServices || formData.selectedServices.length === 0) {
      errors.services = 'Please select at least one repair service to continue.';
    }

    // Time slot selection
    if (!formData.timeSlotId) {
      errors.timeSlot = 'Please select a preferred time slot for the repair service.';
    }

    // Base validation
    const baseValidation = this.validateBookingForm({
      email: formData.email,
      address: formData.address,
      alternateNumber: formData.alternateNumber
    });

    // Merge errors
    const allErrors = { ...errors, ...baseValidation.errors };

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors
    };
  }
};