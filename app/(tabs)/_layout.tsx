import { Tabs } from "expo-router";
import { Home, Package, CheckCircle, Truck, User, Boxes } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

export default function TabLayout() {
  const { user } = useAuth();

  const getTabsForRole = () => {
    if (!user) return null;

    const commonTabs = (
      <>
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: "Jobs",
            tabBarIcon: ({ color }) => <Package size={24} color={color} />,
          }}
        />
      </>
    );

    const qcTab = (
      <Tabs.Screen
        name="qc"
        options={{
          title: "QC",
          tabBarIcon: ({ color }) => <CheckCircle size={24} color={color} />,
        }}
      />
    );

    const shippingTab = (
      <Tabs.Screen
        name="shipping"
        options={{
          title: "Shipping",
          tabBarIcon: ({ color }) => <Truck size={24} color={color} />,
        }}
      />
    );

    const inventoryTab = (
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => <Boxes size={24} color={color} />,
        }}
      />
    );

    const profileTab = (
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    );

    switch (user.role) {
      case UserRole.ADMIN:
        return (
          <>
            {commonTabs}
            {qcTab}
            {shippingTab}
            {inventoryTab}
            {profileTab}
          </>
        );
      case UserRole.QC_CHECKER:
        return (
          <>
            {commonTabs}
            {qcTab}
            {profileTab}
          </>
        );
      case UserRole.SHIPPING:
        return (
          <>
            {commonTabs}
            {shippingTab}
            {profileTab}
          </>
        );
      case UserRole.OPERATOR_SCREEN_PRINT:
      case UserRole.PACKER_SCREEN_PRINT:
      case UserRole.OPERATOR_EMBROIDERY:
      case UserRole.PACKER_EMBROIDERY:
      case UserRole.OPERATOR_FULFILLMENT:
        return (
          <>
            {commonTabs}
            {profileTab}
          </>
        );
      default:
        return (
          <>
            {commonTabs}
            {profileTab}
          </>
        );
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1e40af",
        tabBarInactiveTintColor: "#9ca3af",
        headerStyle: {
          backgroundColor: "#1e40af",
        },
        headerTintColor: "white",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      {getTabsForRole()}
    </Tabs>
  );
}