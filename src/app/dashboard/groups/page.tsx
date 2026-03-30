"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetGroupAPI, assetAPI, type AssetGroup } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { motion } from "framer-motion";
import { FolderTree, Plus, Edit, Trash2, ChevronRight, ChevronDown, Package } from "lucide-react";
import toast from "react-hot-toast";

interface GroupNode extends AssetGroup {
  children: GroupNode[];
}

function buildTree(groups: AssetGroup[]): GroupNode[] {
  const map = new Map<string, GroupNode>();
  groups.forEach((g) => map.set(g.id, { ...g, children: [] }));
  const roots: GroupNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<AssetGroup | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [assignModalGroup, setAssignModalGroup] = useState<AssetGroup | null>(null);
  const [assignSearch, setAssignSearch] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["asset-groups"],
    queryFn: () => assetGroupAPI.list(),
    enabled: !!user,
  });

  const { data: assetsData } = useQuery({
    queryKey: ["assets-for-groups"],
    queryFn: () => assetAPI.getAssets({ asset_type: "vehicle" as any }),
    enabled: !!user,
  });
  const assets = useMemo(() => {
    const d = assetsData as any;
    return Array.isArray(d) ? d : d?.items || d?.assets || [];
  }, [assetsData]);

  const tree = useMemo(() => buildTree(groups), [groups]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) => assetGroupAPI.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["asset-groups"] }); toast.success("Group created"); resetModal(); },
    onError: () => toast.error("Failed to create group"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parent_id?: string } }) => assetGroupAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["asset-groups"] }); toast.success("Group updated"); resetModal(); },
    onError: () => toast.error("Failed to update group"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetGroupAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["asset-groups"] }); toast.success("Group deleted"); },
    onError: () => toast.error("Failed to delete group"),
  });

  const resetModal = () => { setShowModal(false); setEditGroup(null); setName(""); setParentId(""); };

  const openCreate = (parent?: string) => { setEditGroup(null); setName(""); setParentId(parent || ""); setShowModal(true); };
  const openEdit = (g: AssetGroup) => { setEditGroup(g); setName(g.name); setParentId(g.parent_id || ""); setShowModal(true); };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editGroup) {
      updateMutation.mutate({ id: editGroup.id, data: { name: name.trim(), parent_id: parentId || undefined } });
    } else {
      createMutation.mutate({ name: name.trim(), parent_id: parentId || undefined });
    }
  };

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const assignVehicle = useCallback(async (assetId: string, groupId: string) => {
    try {
      const asset = assets.find((a: any) => a.id === assetId);
      if (!asset?.vehicle_details) return;
      const existing: string[] = asset.vehicle_details.group_ids || [];
      if (existing.includes(groupId)) return;
      await assetAPI.updateAsset(assetId, {
        vehicle_details: { ...asset.vehicle_details, group_ids: [...existing, groupId] },
      } as any);
      queryClient.invalidateQueries({ queryKey: ["assets-for-groups"] });
      toast.success("Vehicle assigned");
    } catch {
      toast.error("Failed to assign");
    }
  }, [assets, queryClient]);

  const unassignVehicle = useCallback(async (assetId: string, groupId: string) => {
    try {
      const asset = assets.find((a: any) => a.id === assetId);
      if (!asset?.vehicle_details) return;
      const updated = (asset.vehicle_details.group_ids || []).filter((id: string) => id !== groupId);
      await assetAPI.updateAsset(assetId, {
        vehicle_details: { ...asset.vehicle_details, group_ids: updated },
      } as any);
      queryClient.invalidateQueries({ queryKey: ["assets-for-groups"] });
      toast.success("Vehicle removed from group");
    } catch {
      toast.error("Failed to remove");
    }
  }, [assets, queryClient]);

  const renderNode = (node: GroupNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const memberAssets = assets.filter((a: any) => a.vehicle_details?.group_ids?.includes(node.id));
    return (
      <div key={node.id} style={{ paddingLeft: depth * 20 }}>
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
          <button onClick={() => toggle(node.id)} className="p-0.5">
            {node.children.length > 0 || memberAssets.length > 0 ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            ) : <span className="w-5" />}
          </button>
          <FolderTree className="h-4 w-4 text-teal-600" />
          <span className="font-medium text-sm flex-1">{node.name}</span>
          <span className="text-xs text-gray-400">{memberAssets.length} vehicle(s)</span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button onClick={() => setAssignModalGroup(node)} className="p-1 hover:bg-gray-200 rounded" title="Assign vehicles">
              <Package className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button onClick={() => openCreate(node.id)} className="p-1 hover:bg-gray-200 rounded" title="Add subgroup">
              <Plus className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button onClick={() => openEdit(node)} className="p-1 hover:bg-gray-200 rounded" title="Edit">
              <Edit className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button onClick={() => deleteMutation.mutate(node.id)} className="p-1 hover:bg-gray-200 rounded" title="Delete">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>
        {isExpanded && (
          <>
            {memberAssets.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 py-1 text-sm text-gray-600" style={{ paddingLeft: (depth + 1) * 20 + 28 }}>
                <Package className="h-3 w-3 text-gray-400" />
                <span>{a.name}</span>
                <span className="text-xs text-gray-400">{a.vehicle_details?.license_plate}</span>
                <button onClick={() => unassignVehicle(a.id, node.id)} className="ml-auto text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const assignableAssets = useMemo(() => {
    if (!assignModalGroup) return [];
    return assets.filter((a: any) => {
      const gids: string[] = a.vehicle_details?.group_ids || [];
      const matchesSearch = a.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
        (a.vehicle_details?.license_plate || "").toLowerCase().includes(assignSearch.toLowerCase());
      return !gids.includes(assignModalGroup.id) && matchesSearch;
    });
  }, [assets, assignModalGroup, assignSearch]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Groups</h1>
            <p className="text-muted-foreground mt-1">Organize vehicles into hierarchical groups</p>
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Groups ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tree.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FolderTree className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No groups yet. Create one to start organizing your fleet.</p>
              </div>
            ) : (
              <div className="space-y-1">{tree.map((n) => renderNode(n))}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={resetModal} title={editGroup ? "Edit Group" : "Create Group"}>
        <div className="space-y-4 p-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Johannesburg Fleet" />
          </div>
          <div>
            <label className="text-sm font-medium">Parent Group (optional)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">None (root)</option>
              {groups.filter((g) => g.id !== editGroup?.id).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editGroup ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Vehicles Modal */}
      <Modal isOpen={!!assignModalGroup} onClose={() => { setAssignModalGroup(null); setAssignSearch(""); }} title={`Assign Vehicles to "${assignModalGroup?.name}"`}>
        <div className="p-4 space-y-3">
          <Input placeholder="Search vehicles..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
          <div className="max-h-60 overflow-y-auto divide-y">
            {assignableAssets.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.vehicle_details?.license_plate}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => assignVehicle(a.id, assignModalGroup!.id)}>
                  Assign
                </Button>
              </div>
            ))}
            {assignableAssets.length === 0 && (
              <p className="py-4 text-center text-gray-400 text-sm">All vehicles already assigned or none match search</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
