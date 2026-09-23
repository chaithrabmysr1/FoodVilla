import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "../../api/authApi";
import { TOKEN_KEY } from "../../api/apiClient";
import type { AuthUser, SignupRequest } from "../../types/models";

const USER_KEY = "foodvilla_user";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  // "idle" = still restoring from storage on app startup (Splash waits on this)
  status: "idle" | "authenticated" | "unauthenticated";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
};

async function persistSession(token: string, user: AuthUser) {
  // Token in SecureStore (encrypted keychain/keystore) since it's a bearer
  // credential; user profile in AsyncStorage since it's not sensitive and
  // SecureStore has tight per-key size limits on some platforms.
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export const restoreSession = createAsyncThunk("auth/restoreSession", async () => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const userRaw = await AsyncStorage.getItem(USER_KEY);
  if (token && userRaw) {
    return { token, user: JSON.parse(userRaw) as AuthUser };
  }
  return null;
});

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.login(payload.email, payload.password);
      const user: AuthUser = {
        fullName: res.data.fullName,
        phoneNumber: res.data.phoneNumber,
        address: res.data.address,
        role: res.data.role,
        email: payload.email,
      };
      await persistSession(res.data.token, user);
      return { token: res.data.token, user };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async (payload: SignupRequest, { rejectWithValue }) => {
    try {
      const res = await authApi.signup(payload);
      return res.data.message;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Signup failed");
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await clearSession();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action: PayloadAction<{ token: string; user: AuthUser } | null>) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.status = "authenticated";
        } else {
          state.status = "unauthenticated";
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = "unauthenticated";
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = "authenticated";
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.error = (action.payload as string) || "Login failed";
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.error = (action.payload as string) || "Signup failed";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.status = "unauthenticated";
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
