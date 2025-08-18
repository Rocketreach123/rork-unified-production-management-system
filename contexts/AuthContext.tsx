import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole } from "@/types/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in production, this would call an API
    const mockUsers: Record<string, User> = {
      "admin@company.com": {
        id: "1",
        email: "admin@company.com",
        name: "Admin User",
        role: UserRole.ADMIN,
      },
      "screen_room@company.com": {
        id: "2",
        email: "screen_room@company.com",
        name: "Screen Room Operator",
        role: UserRole.SCREEN_ROOM,
      },
      "screen_print@company.com": {
        id: "3",
        email: "screen_print@company.com",
        name: "Screen Print Operator",
        role: UserRole.SCREEN_PRINT,
      },
      "embroidery@company.com": {
        id: "4",
        email: "embroidery@company.com",
        name: "Embroidery Operator",
        role: UserRole.EMBROIDERY,
      },
      "fulfillment@company.com": {
        id: "5",
        email: "fulfillment@company.com",
        name: "Fulfillment Operator",
        role: UserRole.FULFILLMENT,
      },
      "qc@company.com": {
        id: "6",
        email: "qc@company.com",
        name: "QC Inspector",
        role: UserRole.QC,
      },
      "shipping@company.com": {
        id: "7",
        email: "shipping@company.com",
        name: "Shipping Operator",
        role: UserRole.SHIPPING,
      },
      "preproduction@company.com": {
        id: "8",
        email: "preproduction@company.com",
        name: "Preproduction Operator",
        role: UserRole.PREPRODUCTION,
      },
    };

    const foundUser = mockUsers[email];
    if (foundUser && password === "password") {
      setUser(foundUser);
      await AsyncStorage.setItem("user", JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return {
    user,
    isLoading,
    login,
    logout,
  };
});