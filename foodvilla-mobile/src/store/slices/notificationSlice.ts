import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as notificationApi from "../../api/notificationApi";
import type { AppNotification } from "../../types/models";

interface NotificationState {
  items: AppNotification[];
  loaded: boolean;
}

const initialState: NotificationState = {
  items: [],
  loaded: false,
};

export const fetchNotifications = createAsyncThunk("notifications/fetch", async () => {
  const res = await notificationApi.listNotifications(0, 30);
  return res.data.content;
});

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: number) => {
    await notificationApi.markRead(id);
    return id;
  }
);

export const markAllNotificationsRead = createAsyncThunk("notifications/markAllRead", async () => {
  await notificationApi.markAllRead();
});

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    resetNotifications(state) {
      state.items = [];
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loaded = true;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find((n) => n.id === action.payload);
        if (item) item.read = true;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => (n.read = true));
      });
  },
});

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
