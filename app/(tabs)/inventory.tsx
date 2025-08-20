import React, { useCallback, useMemo, useRef, useState } from "react";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "@/lib/trpc";
import {
  InventoryCategoryEnum,
  InventoryUnitEnum,
  MovementTypeEnum,
  POStatusEnum,
  SubscriptionFrequencyEnum,
  type InventoryItem,
  type POLineItem,
  type PurchaseOrder,
} from "@/types/inventory";
import { PlusCircle, PackagePlus, ClipboardList, Send, RefreshCw, CheckCircle2 } from "lucide-react-native";

const fontWeight600 = "600" as const;

type TabKey = "items" | "pos" | "movements" | "subscriptions" | "consignment";

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("items");

  return (
    <View style={styles.container} testID="inventory-screen">
      <Stack.Screen
        options={{
          title: "Inventory & POs",
        }}
      />
      <View style={styles.tabRow}>
        <TabButton label="Items" active={activeTab === "items"} onPress={() => setActiveTab("items")} testID="tab-items" />
        <TabButton label="POs" active={activeTab === "pos"} onPress={() => setActiveTab("pos")} testID="tab-pos" />
        <TabButton label="Movements" active={activeTab === "movements"} onPress={() => setActiveTab("movements")} testID="tab-movements" />
        <TabButton label="Subs" active={activeTab === "subscriptions"} onPress={() => setActiveTab("subscriptions")} testID="tab-subscriptions" />
        <TabButton label="Consign" active={activeTab === "consignment"} onPress={() => setActiveTab("consignment")} testID="tab-consignment" />
      </View>
      {activeTab === "items" && <ItemsTab />}
      {activeTab === "pos" && <POsTab />}
      {activeTab === "movements" && <MovementsTab />}
      {activeTab === "subscriptions" && <SubscriptionsTab />}
      {activeTab === "consignment" && <ConsignmentTab />}
    </View>
  );
}

function TabButton({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active ? styles.tabBtnActive : undefined]} testID={testID}>
      <Text style={[styles.tabBtnText, active ? styles.tabBtnTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

function ItemsTab() {
  const [query, setQuery] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const utils = trpc.useUtils();

  const list = trpc.inventory.listItems.useQuery({ query }, { suspense: false });

  const [name, setName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [category, setCategory] = useState<(typeof InventoryCategoryEnum)["_output"]>("ink");
  const [unit, setUnit] = useState<(typeof InventoryUnitEnum)["_output"]>("gal");
  const [location, setLocation] = useState<string>("WH-A1");
  const [reorder, setReorder] = useState<string>("0");
  const [max, setMax] = useState<string>("0");
  const [vendorId, setVendorId] = useState<string>("");
  const [isSubscription, setIsSubscription] = useState<string>("false");
  const [isConsignment, setIsConsignment] = useState<string>("false");

  const createItem = trpc.inventory.createItem.useMutation({
    onSuccess: async () => {
      await utils.inventory.listItems.invalidate();
      setCreating(false);
      setName("");
      setSku("");
      console.log("item created");
    },
    onError: (e) => {
      Alert.alert("Error", e.message);
    },
  });

  const seed = useCallback(async () => {
    try {
      console.log("seeding inventory demo data");
      setCreating(true);
      const items: Array<Parameters<typeof createItem.mutateAsync>[0]> = [
        { name: "White Plastisol Ink", sku: "INK-WHT-PLAS-5G", category: "ink", unit: "gal", location: "INK-ROW-1", reorder_threshold: 2, max_threshold: 6, vendor_id: "S&S" },
        { name: "Black Thread 2703", sku: "THR-2703", category: "thread", unit: "each", location: "EMB-THR-2", reorder_threshold: 5, max_threshold: 20, vendor_id: "Madeira" },
        { name: "Adhesive Spray", sku: "CHEM-ADH-SPRAY", category: "chemical", unit: "each", location: "CHEM-3", reorder_threshold: 4, max_threshold: 12, vendor_id: "Ryonet" },
      ];
      for (const it of items) {
        await createItem.mutateAsync(it);
      }
      await utils.inventory.listItems.invalidate();
      Alert.alert("Seeded", "Created 3 sample items.");
    } catch (e: any) {
      Alert.alert("Seed error", e?.message ?? "Unknown");
    } finally {
      setCreating(false);
    }
  }, [createItem, utils.inventory.listItems]);

  const onCreate = useCallback(() => {
    const reorderNum = Number(reorder ?? "0");
    const maxNum = Number(max ?? "0");
    createItem.mutate({
      name,
      sku: sku || undefined,
      category,
      unit,
      location,
      reorder_threshold: Number.isFinite(reorderNum) ? reorderNum : 0,
      max_threshold: Number.isFinite(maxNum) ? maxNum : undefined,
      vendor_id: vendorId || undefined,
      is_subscription: isSubscription === "true",
      is_consignment: isConsignment === "true",
    });
  }, [name, sku, category, unit, location, reorder, max, vendorId, isSubscription, isConsignment, createItem]);

  const renderItem = useCallback(({ item }: { item: InventoryItem }) => {
    return (
      <View style={styles.card} testID={`inv-item-${item.id}`}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.badge}>{item.category}</Text>
        </View>
        <Text style={styles.mono}>SKU: {item.sku ?? "—"}</Text>
        <Text style={styles.meta}>Unit: {item.unit} • Loc: {item.location}</Text>
        <Text style={styles.meta}>Reorder: {item.reorder_threshold} • Max: {item.max_threshold ?? "—"}</Text>
        <Text style={styles.meta}>Vendor: {item.vendor_id ?? "—"}</Text>
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollPad}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Item</Text>
          <View style={styles.row}>
            <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} testID="create-name" />
            <TextInput placeholder="SKU" value={sku} onChangeText={setSku} style={styles.input} testID="create-sku" />
          </View>
          <View style={styles.row}>
            <TextInput placeholder="Category (ink/thread/...)" value={category} onChangeText={(t) => setCategory(t as any)} style={styles.input} testID="create-category" />
            <TextInput placeholder="Unit (gal/qt/lb/each)" value={unit} onChangeText={(t) => setUnit(t as any)} style={styles.input} testID="create-unit" />
          </View>
          <View style={styles.row}>
            <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={styles.input} testID="create-location" />
            <TextInput placeholder="Vendor ID" value={vendorId} onChangeText={setVendorId} style={styles.input} testID="create-vendor" />
          </View>
          <View style={styles.row}>
            <TextInput placeholder="Reorder Threshold" keyboardType="number-pad" value={reorder} onChangeText={setReorder} style={styles.input} testID="create-reorder" />
            <TextInput placeholder="Max Threshold" keyboardType="number-pad" value={max} onChangeText={setMax} style={styles.input} testID="create-max" />
          </View>
          <View style={styles.row}>
            <TextInput placeholder="Subscription? true/false" value={isSubscription} onChangeText={setIsSubscription} style={styles.input} testID="create-subs" />
            <TextInput placeholder="Consignment? true/false" value={isConsignment} onChangeText={setIsConsignment} style={styles.input} testID="create-consign" />
          </View>
          <View style={styles.actionsRow}>
            <Pressable onPress={onCreate} style={styles.primaryBtn} testID="btn-create-item">
              <PlusCircle size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Create Item</Text>
            </Pressable>
            <Pressable onPress={seed} style={styles.secondaryBtn} testID="btn-seed">
              <PackagePlus size={18} color="#1e40af" />
              <Text style={styles.secondaryBtnText}>Seed Demo Items</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <TextInput placeholder="Search items" value={query} onChangeText={setQuery} style={styles.input} testID="search-items" />
          {list.isLoading ? (
            <ActivityIndicator />
          ) : list.error ? (
            <Text style={styles.error}>Error: {String(list.error.message)}</Text>
          ) : (
            <FlatList
              data={list.data ?? []}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text>No items yet.</Text>}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function POsTab() {
  const utils = trpc.useUtils();
  const listPOs = trpc.inventory.listPOs.useQuery({}, { suspense: false });
  const listItems = trpc.inventory.listItems.useQuery({}, { suspense: false });
  const listLines = trpc.inventory.listPOLineItems.useQuery(
    { po_id: listPOs.data?.[0]?.id ?? "" },
    { enabled: !!listPOs.data?.[0]?.id }
  );

  const createPO = trpc.inventory.createPO.useMutation({
    onSuccess: async () => {
      await utils.inventory.listPOs.invalidate();
      Alert.alert("PO Created", "Draft PO created");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const receiveLine = trpc.inventory.receivePOLine.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.inventory.listPOs.invalidate(), utils.inventory.listMovements.invalidate(), utils.inventory.listPOLineItems.invalidate()]);
      Alert.alert("Received", "Line received and inventory updated");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const [vendorId, setVendorId] = useState<string>("S&S");
  const [createdBy, setCreatedBy] = useState<string>("demo_user");
  const [desc, setDesc] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("0");
  const [linkItemId, setLinkItemId] = useState<string>("");

  const handleCreatePO = useCallback(() => {
    const q = Number(qty || "1");
    const c = Number(unitCost || "0");
    createPO.mutate({
      vendor_id: vendorId,
      created_by: createdBy,
      items: [
        {
          inventory_item_id: linkItemId || undefined,
          description: desc || (listItems.data?.find((i) => i.id === linkItemId)?.name ?? "Line Item"),
          quantity_ordered: Number.isFinite(q) ? q : 1,
          unit_cost: Number.isFinite(c) ? c : 0,
        },
      ],
    });
  }, [vendorId, createdBy, linkItemId, desc, qty, unitCost, createPO, listItems.data]);

  const [recvQty, setRecvQty] = useState<string>("1");
  const [recvPoId, setRecvPoId] = useState<string>("");
  const [recvLineId, setRecvLineId] = useState<string>("");
  const [recvBy, setRecvBy] = useState<string>("receiver_1");

  const handleReceive = useCallback(() => {
    const q = Number(recvQty || "1");
    if (!recvPoId || !recvLineId) {
      Alert.alert("Select PO/Line", "Please fill PO ID and Line ID");
      return;
    }
    receiveLine.mutate({ po_id: recvPoId, line_item_id: recvLineId, quantity_received: Number.isFinite(q) ? q : 1, received_by: recvBy });
  }, [recvQty, recvPoId, recvLineId, recvBy, receiveLine]);

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Draft PO</Text>
        <View style={styles.row}>
          <TextInput placeholder="Vendor ID" value={vendorId} onChangeText={setVendorId} style={styles.input} testID="po-vendor" />
          <TextInput placeholder="Created By" value={createdBy} onChangeText={setCreatedBy} style={styles.input} testID="po-createdby" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Link Inventory Item ID (optional)" value={linkItemId} onChangeText={setLinkItemId} style={styles.input} testID="po-itemid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Description" value={desc} onChangeText={setDesc} style={styles.input} testID="po-desc" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Quantity" keyboardType="number-pad" value={qty} onChangeText={setQty} style={styles.input} testID="po-qty" />
          <TextInput placeholder="Unit Cost" keyboardType="decimal-pad" value={unitCost} onChangeText={setUnitCost} style={styles.input} testID="po-unitcost" />
        </View>
        <Pressable onPress={handleCreatePO} style={styles.primaryBtn} testID="btn-create-po">
          <ClipboardList size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Create PO</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>POs</Text>
        {listPOs.isLoading ? (
          <ActivityIndicator />
        ) : listPOs.error ? (
          <Text style={styles.error}>Error: {String(listPOs.error.message)}</Text>
        ) : (
          <View>
            {(listPOs.data ?? []).map((po) => (
              <POCard key={po.id} po={po} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receive Line</Text>
        <View style={styles.row}>
          <TextInput placeholder="PO ID" value={recvPoId} onChangeText={setRecvPoId} style={styles.input} testID="recv-poid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Line Item ID" value={recvLineId} onChangeText={setRecvLineId} style={styles.input} testID="recv-lineid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Quantity Received" keyboardType="number-pad" value={recvQty} onChangeText={setRecvQty} style={styles.input} testID="recv-qty" />
          <TextInput placeholder="Received By" value={recvBy} onChangeText={setRecvBy} style={styles.input} testID="recv-by" />
        </View>
        <Pressable onPress={handleReceive} style={styles.secondaryBtn} testID="btn-receive-line">
          <CheckCircle2 size={18} color="#1e40af" />
          <Text style={styles.secondaryBtnText}>Receive</Text>
        </Pressable>

        {listLines.data && listLines.data.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.meta}>Lines for first PO:</Text>
            {listLines.data.map((li) => (
              <Text key={li.id} style={styles.mono}>• {li.id} – {li.description} ({li.quantity_received}/{li.quantity_ordered})</Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function POCard({ po }: { po: PurchaseOrder }) {
  const statusColor = useMemo(() => {
    switch (po.status) {
      case POStatusEnum.enum.draft:
        return "#374151";
      case POStatusEnum.enum.submitted:
        return "#1e40af";
      case POStatusEnum.enum.partial_received:
        return "#d97706";
      case POStatusEnum.enum.received:
        return "#059669";
      case POStatusEnum.enum.closed:
        return "#6b7280";
      default:
        return "#374151";
    }
  }, [po.status]);

  return (
    <View style={styles.card} testID={`po-${po.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{po.po_number}</Text>
        <Text style={[styles.badge, { backgroundColor: statusColor, color: "#fff" }]}> {po.status} </Text>
      </View>
      <Text style={styles.meta}>Vendor: {po.vendor_id} • Created By: {po.created_by}</Text>
      <Text style={styles.mono}>ID: {po.id}</Text>
    </View>
  );
}

function MovementsTab() {
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [createdBy, setCreatedBy] = useState<string>("user_1");
  const [type, setType] = useState<(typeof MovementTypeEnum)["_output"]>("add");
  const utils = trpc.useUtils();

  const list = trpc.inventory.listMovements.useQuery({ inventory_item_id: itemId || undefined }, { suspense: false });

  const add = trpc.inventory.addMovement.useMutation({
    onSuccess: async () => {
      await utils.inventory.listMovements.invalidate();
      Alert.alert("Movement Added", "Inventory updated");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const onAdd = useCallback(() => {
    const q = Number(qty || "1");
    add.mutate({ inventory_item_id: itemId, quantity: Number.isFinite(q) ? q : 1, type, reason: reason || undefined, created_by: createdBy });
  }, [add, itemId, qty, type, reason, createdBy]);

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Movement</Text>
        <View style={styles.row}>
          <TextInput placeholder="Item ID" value={itemId} onChangeText={setItemId} style={styles.input} testID="mv-itemid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Quantity" keyboardType="number-pad" value={qty} onChangeText={setQty} style={styles.input} testID="mv-qty" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Type (add/remove/adjust)" value={type} onChangeText={(t) => setType(t as any)} style={styles.input} testID="mv-type" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Reason" value={reason} onChangeText={setReason} style={styles.input} testID="mv-reason" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Created By" value={createdBy} onChangeText={setCreatedBy} style={styles.input} testID="mv-by" />
        </View>
        <Pressable onPress={onAdd} style={styles.primaryBtn} testID="btn-add-movement">
          <Send size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movements</Text>
        {list.isLoading ? (
          <ActivityIndicator />
        ) : list.error ? (
          <Text style={styles.error}>Error: {String(list.error.message)}</Text>
        ) : (
          <View>
            {(list.data ?? []).map((m) => (
              <View key={m.id} style={styles.card} testID={`mv-${m.id}`}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{m.type.toUpperCase()} {m.quantity}</Text>
                  <Text style={styles.badge}>{m.created_at?.slice(0, 19).replace("T", " ")}</Text>
                </View>
                <Text style={styles.mono}>Item: {m.inventory_item_id}</Text>
                <Text style={styles.meta}>By: {m.created_by} • Reason: {m.reason ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SubscriptionsTab() {
  const utils = trpc.useUtils();
  const listItems = trpc.inventory.listItems.useQuery({}, { suspense: false });
  const listSubs = trpc.inventory.listSubscriptions.useQuery(undefined, { suspense: false });
  const createSub = trpc.inventory.createSubscription.useMutation({
    onSuccess: async () => {
      await utils.inventory.listSubscriptions.invalidate();
      Alert.alert("Subscription Created", "Next order scheduled");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const runSubs = trpc.inventory.runSubscriptions.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.inventory.listPOs.invalidate(), utils.inventory.listPOLineItems.invalidate()]);
      Alert.alert("Run Complete", "Subscriptions processed");
    },
  });

  const [invId, setInvId] = useState<string>("");
  const [freq, setFreq] = useState<(typeof SubscriptionFrequencyEnum)["_output"]>("monthly");
  const [qty, setQty] = useState<string>("1");
  const [nextDate, setNextDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const onCreate = useCallback(() => {
    const q = Number(qty || "1");
    createSub.mutate({ inventory_item_id: invId, frequency: freq, quantity: Number.isFinite(q) ? q : 1, next_order_date: nextDate });
  }, [createSub, invId, freq, qty, nextDate]);

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Subscription</Text>
        <View style={styles.row}>
          <TextInput placeholder="Inventory Item ID" value={invId} onChangeText={setInvId} style={styles.input} testID="sub-itemid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Frequency (weekly/biweekly/monthly)" value={freq} onChangeText={(t) => setFreq(t as any)} style={styles.input} testID="sub-freq" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Quantity" keyboardType="number-pad" value={qty} onChangeText={setQty} style={styles.input} testID="sub-qty" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Next Order Date (YYYY-MM-DD)" value={nextDate} onChangeText={setNextDate} style={styles.input} testID="sub-date" />
        </View>
        <View style={styles.actionsRow}>
          <Pressable onPress={onCreate} style={styles.primaryBtn} testID="btn-create-sub">
            <PlusCircle size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Create</Text>
          </Pressable>
          <Pressable onPress={() => runSubs.mutate()} style={styles.secondaryBtn} testID="btn-run-subs">
            <RefreshCw size={18} color="#1e40af" />
            <Text style={styles.secondaryBtnText}>Run Scheduler</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscriptions</Text>
        {listSubs.isLoading ? (
          <ActivityIndicator />
        ) : listSubs.error ? (
          <Text style={styles.error}>Error: {String(listSubs.error.message)}</Text>
        ) : (
          <View>
            {(listSubs.data ?? []).map((s) => (
              <View key={s.id} style={styles.card} testID={`sub-${s.id}`}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{listItems.data?.find((i) => i.id === s.inventory_item_id)?.name ?? s.inventory_item_id}</Text>
                  <Text style={styles.badge}>{s.frequency}</Text>
                </View>
                <Text style={styles.meta}>Qty: {s.quantity} • Next: {s.next_order_date}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ConsignmentTab() {
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [usedOn, setUsedOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [usedBy, setUsedBy] = useState<string>("operator_1");
  const utils = trpc.useUtils();

  const list = trpc.inventory.listConsignment.useQuery({ inventory_item_id: itemId || undefined }, { suspense: false });
  const log = trpc.inventory.logConsignmentUse.useMutation({
    onSuccess: async () => {
      await utils.inventory.listConsignment.invalidate();
      Alert.alert("Logged", "Consignment usage recorded");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const onLog = useCallback(() => {
    const q = Number(qty || "1");
    log.mutate({ inventory_item_id: itemId, quantity_used: Number.isFinite(q) ? q : 1, used_on: usedOn, used_by: usedBy });
  }, [log, itemId, qty, usedOn, usedBy]);

  const runReorder = trpc.inventory.runAutoReorder.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.inventory.listPOs.invalidate()]);
      Alert.alert("Auto-Reorder", "Check drafts for generated POs");
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollPad}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Usage</Text>
        <View style={styles.row}>
          <TextInput placeholder="Inventory Item ID" value={itemId} onChangeText={setItemId} style={styles.input} testID="cons-itemid" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Quantity Used" keyboardType="number-pad" value={qty} onChangeText={setQty} style={styles.input} testID="cons-qty" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Used On (YYYY-MM-DD)" value={usedOn} onChangeText={setUsedOn} style={styles.input} testID="cons-date" />
        </View>
        <View style={styles.row}>
          <TextInput placeholder="Used By" value={usedBy} onChangeText={setUsedBy} style={styles.input} testID="cons-by" />
        </View>
        <View style={styles.actionsRow}>
          <Pressable onPress={onLog} style={styles.primaryBtn} testID="btn-cons-log">
            <Send size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Log</Text>
          </Pressable>
          <Pressable onPress={() => runReorder.mutate()} style={styles.secondaryBtn} testID="btn-auto-reorder">
            <RefreshCw size={18} color="#1e40af" />
            <Text style={styles.secondaryBtnText}>Run Auto-Reorder</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consignment Usage</Text>
        {list.isLoading ? (
          <ActivityIndicator />
        ) : list.error ? (
          <Text style={styles.error}>Error: {String(list.error.message)}</Text>
        ) : (
          <View>
            {(list.data ?? []).map((c) => (
              <View key={c.id} style={styles.card} testID={`cons-${c.id}`}>
                <Text style={styles.cardTitle}>{c.inventory_item_id}</Text>
                <Text style={styles.meta}>Qty: {c.quantity_used} • {c.used_on} • By: {c.used_by}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabRow: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#e5e7eb" },
  tabBtnActive: { backgroundColor: "#c7d2fe" },
  tabBtnText: { color: "#374151", fontWeight: fontWeight600 },
  tabBtnTextActive: { color: "#1e40af" },
  scrollPad: { padding: 12 },
  section: { backgroundColor: "#ffffff", borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: fontWeight600, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#f9fafb" },
  actionsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  primaryBtn: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#1e40af", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: "#fff", fontWeight: fontWeight600 },
  secondaryBtn: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#e0e7ff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryBtnText: { color: "#1e40af", fontWeight: fontWeight600 },
  card: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: fontWeight600, color: "#111827" },
  badge: { backgroundColor: "#e5e7eb", color: "#111827", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  meta: { color: "#4b5563", marginTop: 2 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), color: "#374151" },
  error: { color: "#b91c1c" },
});
