import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, UserRole } from "@/types/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changeRole: (role: UserRole) => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const persistUser = async (u: User) => {
    try {
      await AsyncStorage.setItem("user", JSON.stringify(u));
    } catch (e) {
      console.error("Persist user error", e);
    }
  };

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
    const mockUsers: Record<string, User> = {
      "admin@company.com": {
        id: "1",
        email: "admin@company.com",
        name: "Admin User",
        role: UserRole.ADMIN,
      },
      "operator_screen_print@company.com": {
        id: "2",
        email: "operator_screen_print@company.com",
        name: "Operator – Screen Print",
        role: UserRole.OPERATOR_SCREEN_PRINT,
      },
      "packer_screen_print@company.com": {
        id: "3",
        email: "packer_screen_print@company.com",
        name: "Packer – Screen Print",
        role: UserRole.PACKER_SCREEN_PRINT,
      },
      "operator_embroidery@company.com": {
        id: "4",
        email: "operator_embroidery@company.com",
        name: "Operator – Embroidery",
        role: UserRole.OPERATOR_EMBROIDERY,
      },
      "packer_embroidery@company.com": {
        id: "5",
        email: "packer_embroidery@company.com",
        name: "Packer – Embroidery",
        role: UserRole.PACKER_EMBROIDERY,
      },
      "operator_fulfillment@company.com": {
        id: "6",
        email: "operator_fulfillment@company.com",
        name: "Operator – Fulfillment",
        role: UserRole.OPERATOR_FULFILLMENT,
      },
      "qc_checker@company.com": {
        id: "7",
        email: "qc_checker@company.com",
        name: "QC Checker",
        role: UserRole.QC_CHECKER,
      },
      "shipping@company.com": {
        id: "8",
        email: "shipping@company.com",
        name: "Shipping",
        role: UserRole.SHIPPING,
      },
    };

    const foundUser = mockUsers[email];
    if (foundUser && password === "password") {
      setUser(foundUser);
      await persistUser(foundUser);
      return true;
    }
    return false;
  };

  const changeRole = async (role: UserRole) => {
    try {
      const base: User = user ?? {
        id: "temp",
        email: "temp@company.com",
        name: "Demo User",
        role,
      };
      const updated: User = { ...base, role };
      setUser(updated);
      await persistUser(updated);
    } catch (e) {
      console.error("changeRole error", e);
    }
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
    changeRole,
  };
});