const API_BASE_URL = 'http://localhost:8000/api';

export interface AuthUser {
  createdAt: string;
  email: string;
  fullName: string;
  id: number;
  isActive: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  twoFactorEnabled?: boolean;
  updatedAt: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  otp?: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  refreshToken?: string;
  token: string;
  user: AuthUser;
}

export interface LoginResponse {
  message: string;
  refreshToken?: string;
  requires2fa?: boolean;
  token?: string;
  user?: AuthUser;
}

export interface ChangePasswordPayload {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  message?: string;
  provisioningUri?: string;
  secret?: string;
  setupPending: boolean;
}

export interface TwoFactorCodePayload {
  code: string;
}

export interface DisableTwoFactorPayload {
  code: string;
  currentPassword: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type ApiUser = {
  createdAt?: string;
  created_at?: string;
  email: string;
  fullName?: string;
  full_name?: string;
  id: number;
  isActive?: boolean;
  isAdmin?: boolean | number;
  isVerified?: boolean;
  is_active?: boolean;
  is_admin?: boolean | number;
  is_verified?: boolean;
  twoFactorEnabled?: boolean;
  two_factor_enabled?: boolean;
  updatedAt?: string;
  updated_at?: string;
};

type ApiAuthResponse = {
  message: string;
  refreshToken?: string;
  refresh_token?: string;
  requires2fa?: boolean;
  requires_2fa?: boolean;
  token?: string;
  user?: ApiUser;
};

type ApiTwoFactorStatus = {
  enabled: boolean;
  message?: string;
  provisioningUri?: string;
  provisioning_uri?: string;
  secret?: string;
  setupPending?: boolean;
  setup_pending?: boolean;
};

const normalizeUser = (user: ApiUser): AuthUser => ({
  createdAt: user.createdAt ?? user.created_at ?? '',
  email: user.email,
  fullName: user.fullName ?? user.full_name ?? '',
  id: user.id,
  isActive: user.isActive ?? user.is_active ?? false,
  isAdmin: Number(user.isAdmin ?? user.is_admin ?? 0) > 0,
  isVerified: user.isVerified ?? user.is_verified ?? false,
  twoFactorEnabled: user.twoFactorEnabled ?? user.two_factor_enabled ?? false,
  updatedAt: user.updatedAt ?? user.updated_at ?? '',
});

const normalizeAuthResponse = (data: ApiAuthResponse): AuthResponse => ({
  message: data.message,
  refreshToken: data.refreshToken ?? data.refresh_token,
  token: data.token ?? '',
  user: normalizeUser(data.user as ApiUser),
});

const normalizeLoginResponse = (data: ApiAuthResponse): LoginResponse => ({
  message: data.message,
  refreshToken: data.refreshToken ?? data.refresh_token,
  requires2fa: data.requires2fa ?? data.requires_2fa ?? false,
  token: data.token,
  user: data.user ? normalizeUser(data.user) : undefined,
});

const normalizeTwoFactorStatus = (data: ApiTwoFactorStatus): TwoFactorStatus => ({
  enabled: data.enabled,
  message: data.message,
  provisioningUri: data.provisioningUri ?? data.provisioning_uri,
  secret: data.secret,
  setupPending: data.setupPending ?? data.setup_pending ?? false,
});

const createApiError = (data: any, fallbackMessage: string) => {
  // Try to get error message from various possible formats
  let message = fallbackMessage;

  // Try different possible error response formats
  if (typeof data?.detail === 'string') {
    message = data.detail;
  } else if (typeof data?.message === 'string') {
    message = data.message;
  } else if (typeof data?.error === 'string') {
    message = data.error;
  } else if (data?.detail && typeof data.detail === 'object' && data.detail.msg) {
    message = data.detail.msg;
  } else if (Array.isArray(data?.detail)) {
    // Handle validation errors (Pydantic)
    message = data.detail
      .map((err: any) => {
        const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown';
        return `${field}: ${err.msg}`;
      })
      .join('; ');
  }

  const error = new Error(message) as Error & { requires2fa?: boolean };
  const requires2fa = Boolean(data?.requires2fa ?? data?.requires_2fa);

  if (requires2fa) {
    error.requires2fa = true;
  }

  return error;
};

const authHeaders = () => {
  const token = getToken();

  if (!token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const body = {
    confirm_password: payload.confirmPassword,
    email: payload.email,
    full_name: payload.fullName,
    password: payload.password,
  };

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Registration failed');
  }

  return normalizeAuthResponse(data);
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Login failed');
  }

  return normalizeLoginResponse(data);
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to get user');
  }

  return normalizeUser(data);
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    body: JSON.stringify({
      confirm_password: payload.confirmPassword,
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    }),
    headers: authHeaders(),
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Password update failed');
  }

  return data as { message: string };
};

export const getTwoFactorStatus = async (): Promise<TwoFactorStatus> => {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
    headers: authHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to load two-factor status');
  }

  return normalizeTwoFactorStatus(data);
};

export const setupTwoFactor = async (): Promise<TwoFactorStatus> => {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
    headers: authHeaders(),
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to initialize two-factor authentication');
  }

  return normalizeTwoFactorStatus(data);
};

export const enableTwoFactor = async (payload: TwoFactorCodePayload): Promise<TwoFactorStatus> => {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
    body: JSON.stringify(payload),
    headers: authHeaders(),
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to enable two-factor authentication');
  }

  return normalizeTwoFactorStatus(data);
};

export const disableTwoFactor = async (payload: DisableTwoFactorPayload): Promise<TwoFactorStatus> => {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
    body: JSON.stringify({
      code: payload.code,
      current_password: payload.currentPassword,
    }),
    headers: authHeaders(),
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to disable two-factor authentication');
  }

  return normalizeTwoFactorStatus(data);
};

export const logoutUser = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    headers: authHeaders(),
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Logout failed');
  }

  return data as { message: string };
};

export const saveToken = (token: string, refreshToken?: string) => {
  localStorage.setItem('token', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const getToken = (): string | null => localStorage.getItem('token');

export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(data, 'Failed to refresh access token');
  }

  return {
    accessToken: data.accessToken ?? data.access_token,
    refreshToken: data.refreshToken ?? data.refresh_token,
    expiresIn: data.expiresIn ?? data.expires_in,
  };
};
