export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!password.trim()) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateRegisterForm = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation
  if (!data.password.trim()) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0]; // Show first error
    }
  }
  
  // Confirm password validation
  if (!data.confirmPassword.trim()) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // First name validation
  if (!data.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (!validateName(data.firstName)) {
    errors.firstName = 'First name must be at least 2 characters';
  }
  
  // Last name validation
  if (!data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (!validateName(data.lastName)) {
    errors.lastName = 'Last name must be at least 2 characters';
  }
  
  // Phone validation
  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  // Role validation
  if (!data.role || !['client', 'worker'].includes(data.role)) {
    errors.role = 'Please select a role';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateForgotPasswordForm = (email: string): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateResetPasswordForm = (password: string, confirmPassword: string): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!password.trim()) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }
  
  if (!confirmPassword.trim()) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateVerificationCode = (code: string): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!code.trim()) {
    errors.code = 'Verification code is required';
  } else if (!/^\d{6}$/.test(code)) {
    errors.code = 'Please enter a valid 6-digit code';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateJobForm = (data: {
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
  preferredDate: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Title validation
  if (!data.title.trim()) {
    errors.title = 'Job title is required';
  } else if (data.title.length < 5) {
    errors.title = 'Job title must be at least 5 characters';
  } else if (data.title.length > 100) {
    errors.title = 'Job title must be less than 100 characters';
  }
  
  // Description validation
  if (!data.description.trim()) {
    errors.description = 'Job description is required';
  } else if (data.description.length < 20) {
    errors.description = 'Job description must be at least 20 characters';
  } else if (data.description.length > 1000) {
    errors.description = 'Job description must be less than 1000 characters';
  }
  
  // Category validation
  if (!data.category) {
    errors.category = 'Please select a job category';
  }
  
  // Budget validation
  if (!data.budgetMin || data.budgetMin <= 0) {
    errors.budgetMin = 'Minimum budget must be greater than 0';
  }
  
  if (!data.budgetMax || data.budgetMax <= 0) {
    errors.budgetMax = 'Maximum budget must be greater than 0';
  }
  
  if (data.budgetMin && data.budgetMax && data.budgetMin >= data.budgetMax) {
    errors.budgetMax = 'Maximum budget must be greater than minimum budget';
  }
  
  // Location validation
  if (!data.location.trim()) {
    errors.location = 'Job location is required';
  } else if (data.location.length < 3) {
    errors.location = 'Location must be at least 3 characters';
  }
  
  // Preferred date validation
  const preferredDate = new Date(data.preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (preferredDate < today) {
    errors.preferredDate = 'Preferred date cannot be in the past';
  }
  
  return errors;
};